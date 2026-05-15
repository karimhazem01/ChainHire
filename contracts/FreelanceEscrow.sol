// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title FreelanceEscrow
 * @author FreelanceNet Team
 * @notice Manages escrow payments between clients and freelancers on FreelanceNet.
 * @dev Implements Checks-Effects-Interactions pattern and ReentrancyGuard for security.
 *
 * Flow:
 * 1. Client funds escrow when accepting a freelancer (fundJob)
 * 2. Client approves delivery → 99% to freelancer, 1% platform fee (approveDelivery)
 * 3. Client cancels before work starts → full refund (cancelJob)
 * 4. Dispute raised → full refund to client (raiseDispute)
 * 5. Reputation points tracked on-chain per wallet (Choice C asset standard)
 */
contract FreelanceEscrow {

    // ─── Reentrancy Guard ─────────────────────────────────────────────────────

    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    // ─── State Variables ──────────────────────────────────────────────────────

    /// @notice Platform wallet address — receives the 1% fee
    address public immutable owner;

    /// @notice Platform fee percentage (1%)
    uint256 public platformFeePercent = 1;

    /// @notice Tracks reputation points per wallet address
    mapping(address => uint256) public reputationPoints;

    /// @notice Tracks total jobs completed per wallet
    mapping(address => uint256) public completedJobs;

    /// @notice Tracks total ETH earned per freelancer wallet
    mapping(address => uint256) public totalEarned;

    // ─── Job Status Enum ──────────────────────────────────────────────────────

    enum JobStatus { Open, Funded, Completed, Cancelled, Disputed, Refunded }

    // ─── Job Struct ───────────────────────────────────────────────────────────

    struct Job {
        string    jobId;
        address   client;
        address   freelancer;
        uint256   amount;
        uint256   deadline;
        JobStatus status;
    }

    mapping(string => Job) public jobs;

    // ─── Events ───────────────────────────────────────────────────────────────

    event JobFunded(string indexed jobId, address indexed client, address indexed freelancer, uint256 amount, uint256 deadline);
    event JobCompleted(string indexed jobId, address indexed freelancer, uint256 amountPaid, uint256 fee);
    event JobCancelled(string indexed jobId, address indexed client, uint256 refunded);
    event DisputeResolved(string indexed jobId, address indexed client, uint256 refunded);
    event ReputationEarned(address indexed freelancer, uint256 points, uint256 totalPoints);
    event FeeUpdated(uint256 oldFee, uint256 newFee);

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyClient(string memory jobId) {
        require(msg.sender == jobs[jobId].client, "FreelanceEscrow: Only the client can perform this action");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "FreelanceEscrow: Only platform owner can perform this action");
        _;
    }

    modifier jobExists(string memory jobId) {
        require(jobs[jobId].client != address(0), "FreelanceEscrow: Job does not exist");
        _;
    }

    modifier onlyFunded(string memory jobId) {
        require(jobs[jobId].status == JobStatus.Funded, "FreelanceEscrow: Job is not in Funded state");
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
        _status = _NOT_ENTERED;
    }

    // ─── Core Functions ───────────────────────────────────────────────────────

    /**
     * @notice Client funds the escrow when accepting a freelancer.
     * @param jobId      The MongoDB job ID string
     * @param freelancer The accepted freelancer wallet address
     * @param deadline   Unix timestamp of the project deadline
     */
    function fundJob(string memory jobId, address freelancer, uint256 deadline) external payable {
        require(msg.value > 0, "FreelanceEscrow: Must send ETH to fund the job");
        require(freelancer != address(0), "FreelanceEscrow: Invalid freelancer address");
        require(freelancer != msg.sender, "FreelanceEscrow: Client cannot be the freelancer");
        require(deadline > block.timestamp, "FreelanceEscrow: Deadline must be in the future");
        require(jobs[jobId].client == address(0), "FreelanceEscrow: Job already funded");

        jobs[jobId] = Job({
            jobId: jobId,
            client: msg.sender,
            freelancer: freelancer,
            amount: msg.value,
            deadline: deadline,
            status: JobStatus.Funded
        });

        emit JobFunded(jobId, msg.sender, freelancer, msg.value, deadline);
    }

    /**
     * @notice Client approves delivery — releases ETH to freelancer minus 1% fee.
     * @param jobId The MongoDB job ID string
     */
    function approveDelivery(string memory jobId) external nonReentrant jobExists(jobId) onlyClient(jobId) onlyFunded(jobId) {
        Job storage job = jobs[jobId];

        uint256 fee = (job.amount * platformFeePercent) / 100;
        uint256 freelancerPayment = job.amount - fee;
        address freelancerAddr = job.freelancer;

        job.status = JobStatus.Completed;
        job.amount = 0;

        reputationPoints[freelancerAddr] += 10;
        completedJobs[freelancerAddr] += 1;
        totalEarned[freelancerAddr] += freelancerPayment;

        (bool sentToFreelancer, ) = freelancerAddr.call{value: freelancerPayment}("");
        require(sentToFreelancer, "FreelanceEscrow: Failed to pay freelancer");

        (bool sentToOwner, ) = owner.call{value: fee}("");
        require(sentToOwner, "FreelanceEscrow: Failed to pay platform fee");

        emit JobCompleted(jobId, freelancerAddr, freelancerPayment, fee);
        emit ReputationEarned(freelancerAddr, 10, reputationPoints[freelancerAddr]);
    }

    /**
     * @notice Client cancels the job — full refund to client.
     * @param jobId The MongoDB job ID string
     */
    function cancelJob(string memory jobId) external nonReentrant jobExists(jobId) onlyClient(jobId) onlyFunded(jobId) {
        Job storage job = jobs[jobId];

        uint256 refundAmount = job.amount;
        address clientAddr = job.client;

        job.status = JobStatus.Cancelled;
        job.amount = 0;

        (bool sent, ) = clientAddr.call{value: refundAmount}("");
        require(sent, "FreelanceEscrow: Refund to client failed");

        emit JobCancelled(jobId, clientAddr, refundAmount);
    }

    /**
     * @notice Client raises a dispute — locks funds and changes status to Disputed.
     * @param jobId The MongoDB job ID string
     */
    function raiseDispute(string memory jobId) external nonReentrant jobExists(jobId) onlyClient(jobId) onlyFunded(jobId) {
        jobs[jobId].status = JobStatus.Disputed;
        // Money stays in contract until resolved
    }

    /**
     * @notice Freelancer accepts a dispute — full refund to client.
     * @param jobId The MongoDB job ID string
     */
    function acceptDispute(string memory jobId) external nonReentrant jobExists(jobId) {
        Job storage job = jobs[jobId];
        require(msg.sender == job.freelancer, "FreelanceEscrow: Only the freelancer can accept a dispute");
        require(job.status == JobStatus.Disputed, "FreelanceEscrow: Job is not in Disputed state");

        uint256 refundAmount = job.amount;
        address clientAddr = job.client;

        job.status = JobStatus.Refunded;
        job.amount = 0;

        (bool sent, ) = clientAddr.call{value: refundAmount}("");
        require(sent, "FreelanceEscrow: Dispute refund failed");

        emit DisputeResolved(jobId, clientAddr, refundAmount);
    }

    // ─── View Functions ───────────────────────────────────────────────────────

    /**
     * @notice Get full details of a job.
     * @param jobId The MongoDB job ID string
     */
    function getJob(string memory jobId) external view jobExists(jobId) returns (address client, address freelancer, uint256 amount, uint256 deadline, JobStatus status) {
        Job storage job = jobs[jobId];
        return (job.client, job.freelancer, job.amount, job.deadline, job.status);
    }

    /**
     * @notice Get reputation profile of a wallet.
     * @param wallet The wallet address to query
     */
    function getReputation(address wallet) external view returns (uint256 points, uint256 jobsDone, uint256 earned) {
        return (reputationPoints[wallet], completedJobs[wallet], totalEarned[wallet]);
    }

    /**
     * @notice Get current platform fee.
     */
    function getPlatformFee() external view returns (uint256) {
        return platformFeePercent;
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    /**
     * @notice Owner updates platform fee (max 5%).
     * @param newFee New fee percentage
     */
    function updateFee(uint256 newFee) external onlyOwner {
        require(newFee <= 5, "FreelanceEscrow: Fee cannot exceed 5%");
        uint256 oldFee = platformFeePercent;
        platformFeePercent = newFee;
        emit FeeUpdated(oldFee, newFee);
    }

    // ─── Safety ───────────────────────────────────────────────────────────────

    receive() external payable {
        revert("FreelanceEscrow: Use fundJob() to send ETH");
    }

    fallback() external payable {
        revert("FreelanceEscrow: Function not found");
    }
}
