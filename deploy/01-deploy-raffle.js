const { network, ethers } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

const VRF_SUB_AMOUNT_FUND = ethers.utils.parseEther("2");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;

  // parameter 1
  let vrfCoordinatorV2Address, subscriptionId;

  if (developmentChains.includes(network.name)) {
    const vrf2CoordinatorMock = await ethers.getContract(
      "VRFCoordinatorV2Mock"
    );
    vrfCoordinatorV2Address = vrf2CoordinatorMock.address;

    // parameter 4
    const transactionResponse = await vrf2CoordinatorMock.createSubscription();
    const transactionReceipt = await transactionResponse.wait(1);
    subscriptionId = transactionReceipt.events[0].args.subId;
    // Fund the subscription
    await vrf2CoordinatorMock.fundSubscription(
      subscriptionId,
      VRF_SUB_AMOUNT_FUND
    );
  } else {
    vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"];
    // parameter 4
    subscriptionId = networkConfig[chainId]["subscriptionId"];
  }

  // parameter 2
  const entranceFee = networkConfig[chainId]["entranceFee"];

  // parameter 3
  const keyHash = networkConfig[chainId]["keyHash"];

  // parameter 5
  const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];

  // parameter 6
  const interval = networkConfig[chainId]["interval"];

  const args = [
    entranceFee,
    vrfCoordinatorV2Address,
    keyHash,
    subscriptionId,
    callbackGasLimit,
    interval,
  ];

  log("Deploying Raffle Contract now...");

  const raffleContract = await deploy("Raffle", {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });

  if (!developmentChains.includes(network.name)) {
    log("Verifying Contract now...");
    await verify(raffleContract.address, args);
  }

  log("------------------------------------");
};

module.exports.tags = ["all", "raffle"];
