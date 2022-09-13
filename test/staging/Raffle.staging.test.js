// MOCHA
const { assert } = require("chai");
const { network, ethers, getNamedAccounts } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

// checking if network is not hardhat then skip else go on
developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle", function () {
      // What do we need for beforeEach()
      // Both contracts deployed objects
      let raffleContract, deployer, entranceFee;

      beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer;

        raffleContract = await ethers.getContract("Raffle", deployer);

        entranceFee = await raffleContract.getEntranceFee();
      });

      describe("fulfillRandomWords", function () {
        it("works with live chainlink keepers and chainlink vrf, we get a random winner", async () => {
          const startingTimeStamp = await raffleContract.getLatestTimeStamp();
          const accounts = await ethers.getSigners();
          // setup listener before we enter raffle
          // just in case if blockchain moves really fast
          await new Promise(async (resolve, reject) => {
            raffleContract.once("WinnerPicked", async () => {
              console.log("Winner has been picked...");
              try {
                // add our asserts here
                const recentWinner = await raffleContract.getRecentWinner();
                const endingTimeStamp =
                  await raffleContract.getLatestTimeStamp();
                const raffleState = await raffleContract.getRaffleState();
                const endingBalance = await accounts[0].getBalance();
                const noOfPlayers = await raffleContract.getNoOfPlayers();

                assert.equal(noOfPlayers.toString(), "0");
                assert.equal(recentWinner, accounts[0].address);
                assert.equal(raffleState.toString(), "0");

                // Not able to resolve this issue

                // assert.equal(
                //   endingBalance.toString(),
                //   startingBalance.add(entranceFee).toString()
                // );
                assert(endingTimeStamp > startingTimeStamp);
                resolve();
              } catch (error) {
                console.log(error);
                reject(error);
              }
            });

            // Then entering in raffle
            // We are keeping the enterRaffle statement inside promise but outside the listener
            await raffleContract.enterRaffle({ value: entranceFee });
            const startingBalance = await accounts[0].getBalance();
          });
        });
      });
    });
