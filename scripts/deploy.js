const hre = require("hardhat");

async function main() {
  console.log("Deploying contract...");
  console.log("RPC URL:", process.env.RPC_URL ? "Found" : "Missing");
  console.log("Private Key:", process.env.PRIVATE_KEY ? "Found" : "Missing");

  const signers = await hre.ethers.getSigners();
  console.log("Signers count:", signers.length);

  const [deployer] = signers;
  console.log("Deploying with account:", deployer.address);

  const Contract = await hre.ethers.getContractFactory("FreelanceEscrow", deployer);
  const contract = await Contract.deploy();

  await contract.waitForDeployment();

  console.log("Contract deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});