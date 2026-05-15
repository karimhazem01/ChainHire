const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FreelanceEscrow", function () {
  let escrow;
  let owner, client, freelancer, other;
  const JOB_ID = "job_abc123";
  const ONE_ETH = ethers.parseEther("1.0");
  const deadline = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 7 days from now

  beforeEach(async function () {
    [owner, client, freelancer, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("FreelanceEscrow");
    escrow = await Factory.deploy();
  });

  // ── Happy Path Tests ────────────────────────────────────────────────────────

  describe("Happy Path", function () {

    it("Should fund a job and lock ETH in escrow", async function () {
      await escrow.connect(client).fundJob(JOB_ID, freelancer.address, deadline, { value: ONE_ETH });

      const job = await escrow.getJob(JOB_ID);
      expect(job.client).to.equal(client.address);
      expect(job.freelancer).to.equal(freelancer.address);
      expect(job.amount).to.equal(ONE_ETH);
      expect(job.status).to.equal(1); // Funded = 1
    });

    it("Should approve delivery, pay freelancer 99% and owner 1%", async function () {
      await escrow.connect(client).fundJob(JOB_ID, freelancer.address, deadline, { value: ONE_ETH });

      const freelancerBefore = await ethers.provider.getBalance(freelancer.address);
      const ownerBefore = await ethers.provider.getBalance(owner.address);

      await escrow.connect(client).approveDelivery(JOB_ID);

      const freelancerAfter = await ethers.provider.getBalance(freelancer.address);
      const ownerAfter = await ethers.provider.getBalance(owner.address);

      const expectedFreelancerPayment = ethers.parseEther("0.99");
      const expectedFee = ethers.parseEther("0.01");

      expect(freelancerAfter - freelancerBefore).to.equal(expectedFreelancerPayment);
      expect(ownerAfter - ownerBefore).to.equal(expectedFee);

      const job = await escrow.getJob(JOB_ID);
      expect(job.status).to.equal(2); // Completed = 2
    });

    it("Should give freelancer 10 reputation points after completed job", async function () {
      await escrow.connect(client).fundJob(JOB_ID, freelancer.address, deadline, { value: ONE_ETH });
      await escrow.connect(client).approveDelivery(JOB_ID);

      const rep = await escrow.getReputation(freelancer.address);
      expect(rep.points).to.equal(10);
      expect(rep.jobsDone).to.equal(1);
    });

    it("Should refund client fully when job is cancelled", async function () {
      await escrow.connect(client).fundJob(JOB_ID, freelancer.address, deadline, { value: ONE_ETH });

      const clientBefore = await ethers.provider.getBalance(client.address);
      const tx = await escrow.connect(client).cancelJob(JOB_ID);
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * tx.gasPrice;
      const clientAfter = await ethers.provider.getBalance(client.address);

      expect(clientAfter + gasCost - clientBefore).to.equal(ONE_ETH);

      const job = await escrow.getJob(JOB_ID);
      expect(job.status).to.equal(3); // Cancelled = 3
    });

    it("Should lock funds when dispute is raised, then refund only after freelancer accepts", async function () {
      await escrow.connect(client).fundJob(JOB_ID, freelancer.address, deadline, { value: ONE_ETH });

      const clientBefore = await ethers.provider.getBalance(client.address);
      
      // Client raises dispute
      const tx1 = await escrow.connect(client).raiseDispute(JOB_ID);
      await tx1.wait();
      
      const jobAfterDispute = await escrow.getJob(JOB_ID);
      expect(jobAfterDispute.status).to.equal(4); // Disputed = 4
      expect(jobAfterDispute.amount).to.equal(ONE_ETH); // Funds STILL LOCKED

      const clientAfterDispute = await ethers.provider.getBalance(client.address);
      // Verify no refund yet (ignoring gas for simplicity in this check, but balance shouldn't increase by ONE_ETH)
      expect(clientAfterDispute).to.be.below(clientBefore); 

      // Freelancer accepts dispute
      const tx2 = await escrow.connect(freelancer).acceptDispute(JOB_ID);
      const receipt2 = await tx2.wait();
      const clientAfterAccept = await ethers.provider.getBalance(client.address);

      expect(clientAfterAccept).to.be.above(clientAfterDispute);
      
      const jobAfterAccept = await escrow.getJob(JOB_ID);
      expect(jobAfterAccept.status).to.equal(5); // Refunded = 5
      expect(jobAfterAccept.amount).to.equal(0);
    });

    it("Should reject non-freelancer trying to accept dispute", async function () {
      await escrow.connect(client).fundJob(JOB_ID, freelancer.address, deadline, { value: ONE_ETH });
      await escrow.connect(client).raiseDispute(JOB_ID);
      
      await expect(
        escrow.connect(other).acceptDispute(JOB_ID)
      ).to.be.revertedWith("FreelanceEscrow: Only the freelancer can accept a dispute");
    });
  });

  // ── Edge Case Tests ─────────────────────────────────────────────────────────

  describe("Edge Cases", function () {

    it("Should reject funding with 0 ETH", async function () {
      await expect(
        escrow.connect(client).fundJob(JOB_ID, freelancer.address, deadline, { value: 0 })
      ).to.be.revertedWith("FreelanceEscrow: Must send ETH to fund the job");
    });

    it("Should reject funding the same job twice", async function () {
      await escrow.connect(client).fundJob(JOB_ID, freelancer.address, deadline, { value: ONE_ETH });
      await expect(
        escrow.connect(client).fundJob(JOB_ID, freelancer.address, deadline, { value: ONE_ETH })
      ).to.be.revertedWith("FreelanceEscrow: Job already funded");
    });

    it("Should reject client being their own freelancer", async function () {
      await expect(
        escrow.connect(client).fundJob(JOB_ID, client.address, deadline, { value: ONE_ETH })
      ).to.be.revertedWith("FreelanceEscrow: Client cannot be the freelancer");
    });

    it("Should reject deadline in the past", async function () {
      const pastDeadline = Math.floor(Date.now() / 1000) - 1000;
      await expect(
        escrow.connect(client).fundJob(JOB_ID, freelancer.address, pastDeadline, { value: ONE_ETH })
      ).to.be.revertedWith("FreelanceEscrow: Deadline must be in the future");
    });

    it("Should reject non-client trying to approve delivery", async function () {
      await escrow.connect(client).fundJob(JOB_ID, freelancer.address, deadline, { value: ONE_ETH });
      await expect(
        escrow.connect(other).approveDelivery(JOB_ID)
      ).to.be.revertedWith("FreelanceEscrow: Only the client can perform this action");
    });

    it("Should reject non-client trying to cancel job", async function () {
      await escrow.connect(client).fundJob(JOB_ID, freelancer.address, deadline, { value: ONE_ETH });
      await expect(
        escrow.connect(freelancer).cancelJob(JOB_ID)
      ).to.be.revertedWith("FreelanceEscrow: Only the client can perform this action");
    });

    it("Should reject approving a non-existent job", async function () {
      await expect(
        escrow.connect(client).approveDelivery("fake_job_id")
      ).to.be.revertedWith("FreelanceEscrow: Job does not exist");
    });

    it("Should reject approving an already completed job", async function () {
      await escrow.connect(client).fundJob(JOB_ID, freelancer.address, deadline, { value: ONE_ETH });
      await escrow.connect(client).approveDelivery(JOB_ID);
      await expect(
        escrow.connect(client).approveDelivery(JOB_ID)
      ).to.be.revertedWith("FreelanceEscrow: Job is not in Funded state");
    });

    it("Should reject non-owner updating fee", async function () {
      await expect(
        escrow.connect(client).updateFee(3)
      ).to.be.revertedWith("FreelanceEscrow: Only platform owner can perform this action");
    });

    it("Should reject fee above 5%", async function () {
      await expect(
        escrow.connect(owner).updateFee(6)
      ).to.be.revertedWith("FreelanceEscrow: Fee cannot exceed 5%");
    });

    it("Should reject direct ETH transfer to contract", async function () {
      await expect(
        client.sendTransaction({ to: await escrow.getAddress(), value: ONE_ETH })
      ).to.be.revertedWith("FreelanceEscrow: Use fundJob() to send ETH");
    });
  });

  // ── Reputation System Tests ─────────────────────────────────────────────────

  describe("Reputation System", function () {

    it("Should accumulate reputation across multiple completed jobs", async function () {
      await escrow.connect(client).fundJob("job_1", freelancer.address, deadline, { value: ONE_ETH });
      await escrow.connect(client).approveDelivery("job_1");

      await escrow.connect(client).fundJob("job_2", freelancer.address, deadline, { value: ONE_ETH });
      await escrow.connect(client).approveDelivery("job_2");

      const rep = await escrow.getReputation(freelancer.address);
      expect(rep.points).to.equal(20);
      expect(rep.jobsDone).to.equal(2);
    });

    it("Should not give reputation on cancelled job", async function () {
      await escrow.connect(client).fundJob(JOB_ID, freelancer.address, deadline, { value: ONE_ETH });
      await escrow.connect(client).cancelJob(JOB_ID);

      const rep = await escrow.getReputation(freelancer.address);
      expect(rep.points).to.equal(0);
      expect(rep.jobsDone).to.equal(0);
    });
  });
});