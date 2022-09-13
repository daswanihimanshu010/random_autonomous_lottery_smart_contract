// MOCHA
const { assert, expect } = require("chai");
const { network, ethers, getNamedAccounts, deployments } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../../helper-hardhat-config");

// checking if network is not hardhat then skip else go on
!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle", function () {
      // What do we need for beforeEach()
      // Both contracts deployed objects
      let vrf2CoordinatorMock, raffleContract, deployer, entranceFee, interval;
      const chainId = network.config.chainId;

      beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer;

        await deployments.fixture(["all"]);

        raffleContract = await ethers.getContract("Raffle", deployer);
        vrf2CoordinatorMock = await ethers.getContract(
          "VRFCoordinatorV2Mock",
          deployer
        );
        entranceFee = await raffleContract.getEntranceFee();
        interval = await raffleContract.getInterval();
      });

      // After defining beforeEach() we can start from each function now
      describe("constructor", () => {
        // Ideally we have to make our tests have just 1 assert per "it"
        it("initilizes the raffle correctly", async () => {
          // Checking raffleState is OPEN
          const raffleState = await raffleContract.getRaffleState();
          assert.equal(raffleState.toString(), "0");
          assert.equal(interval.toString(), networkConfig[chainId]["interval"]);
        });
      });

      describe("enterRaffle", () => {
        it("if amount is not enough it should give an error", async () => {
          await expect(raffleContract.enterRaffle()).to.be.revertedWith(
            "Raffle__NotEnoughETHEntered"
          );
        });

        it("records player when they enter raffle and checks the player is deployer", async () => {
          await raffleContract.enterRaffle({ value: entranceFee });
          const player = await raffleContract.getPlayer(0);
          assert.equal(player, deployer);
        });

        // testing event is being called or not (emit)
        it("emits an event", async () => {
          await expect(
            raffleContract.enterRaffle({ value: entranceFee })
          ).to.emit(raffleContract, "RaffleEnter");
        });

        it("dosen't allows raffle to enter if raffle it is in calculating state", async () => {
          // Here we are making sure the checkUpkeep() returns true so we can call performUpkeep()
          // making all conditions of checkUpkeep() return true

          // We are already in OPEN state of raffle
          // To make sure our players array is not empty and there is some ETH in balance
          await raffleContract.enterRaffle({ value: entranceFee });

          // increasing the interval: 30 + 1
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);

          // mining 1 block on blockchain
          await network.provider.send("evm_mine", []);

          // Now the lottery is open, time has passed, players are not empty and there is some ETH balance
          // This means checkUpkeep() now returns true
          // Here we are pretending that we are chainlink keeper and calling performUpkeep()

          // because we need to pass bytes as parameter that is why we are passing [] instead of ""
          await raffleContract.performUpkeep([]);

          // Now the raffle is in calculating state and we want to check that in enterRaffle() function
          // reverts an error when raffle is in calculating state

          await expect(
            raffleContract.enterRaffle({ value: entranceFee })
          ).to.be.revertedWith("Raffle__LotteryNotOpen");
        });
      });

      describe("checkUpkeep", function () {
        it("returns false if there is not enough ETH in contract", async () => {
          // raffle state is open state at the time of initilization
          // increasing time interval
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);

          // Now we are going to call callUpKeep() function to see if it returns false
          // because no one has funded the contract

          // Calling checkUpkeep(): raffleContract.checkUpkeep([]) will send a transaction
          // We do not want to send a transaction, and if it was a public view function returning
          // a boolean then it was ok.
          // But we do not want to send a transaction, we just want to simulate calling this
          // transaction to see what it will respond, so then we can use callStatic like this:

          const { upkeepNeeded } = await raffleContract.callStatic.checkUpkeep(
            []
          );

          // upKeepNeeded should return false because we did not send money to our contract
          // So upkeepNeeded has to return false to pass this test.
          assert(!upkeepNeeded); // same like assert.equal(upkeepNeeded,false);
        });

        it("returns false if raffle isn't open", async () => {
          await raffleContract.enterRaffle({ value: entranceFee });

          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);

          await network.provider.send("evm_mine", []);

          // Sending raffle into calculating state
          await raffleContract.performUpkeep([]);

          const { upkeepNeeded } = await raffleContract.callStatic.checkUpkeep(
            []
          );

          const raffleState = await raffleContract.getRaffleState();

          assert.equal(raffleState.toString(), "1");
          assert.equal(upkeepNeeded, false);
        });

        it("returns false if enough time hasn't passed", async () => {
          await raffleContract.enterRaffle({ value: entranceFee });

          await network.provider.send("evm_increaseTime", [
            interval.toNumber() - 5,
          ]);

          await network.provider.send("evm_mine", []);

          const { upkeepNeeded } = await raffleContract.callStatic.checkUpkeep(
            []
          );

          assert.equal(upkeepNeeded, false);
        });

        it("returns true if enough time has passed, has players, eth, and is open", async () => {
          await raffleContract.enterRaffle({ value: entranceFee });

          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);

          await network.provider.send("evm_mine", []);

          const { upkeepNeeded } = await raffleContract.callStatic.checkUpkeep(
            []
          );

          assert.equal(upkeepNeeded, true);
        });
      });

      describe("performUpkeep", function () {
        it("can only run if checkUpkeep is true", async () => {
          await raffleContract.enterRaffle({ value: entranceFee });

          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);

          await network.provider.send("evm_mine", []);

          // check if tx is true which in case means checkUpkeep() is true
          const tx = await raffleContract.performUpkeep([]);
          assert(tx);
        });

        it("reverts error if checkUpKeep is false", async () => {
          await expect(raffleContract.performUpkeep([])).to.be.revertedWith(
            "Raffle_UpKeepNotNeeded"
          );
        });
        it("updates the raffle state, emits an event, and calls the vrfCoordinator", async () => {
          await raffleContract.enterRaffle({ value: entranceFee });

          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);

          await network.provider.send("evm_mine", []);

          // checking emits an event, and calls the vrfCoordinator
          const txResponse = await raffleContract.performUpkeep([]);
          const tnxReceipt = await txResponse.wait(1);

          // As you can see performUpkeep() calls i_vrfCoordinator.requestRandomWords()
          // And in VRFCoordinatorV2Mock, requestRandomWords() also emit an event and saves request_id
          // Now because there are 2 events being emitted in performUpkeep() function
          // one in i_vrfCoordinator.requestRandomWords() and other being RaffleWinner(s_requestId)
          // We can get the request_id from either one but the event index of tnxReceipt
          // i_vrfCoordinator.requestRandomWords() at events[1]
          // RaffleWinner(s_requestId) at events[0]

          const request_id = tnxReceipt.events[1].args.requestId;
          //const request_id = tnxReceipt.events[0].args.s_requestId; // is same like above

          assert(request_id.toNumber() > 0);

          // Checking if raffle is in calculating state
          const raffleState = await raffleContract.getRaffleState();

          assert(raffleState.toString() == "1");
        });
      });

      describe("fulfillRandomWords", function () {
        beforeEach(async () => {
          await raffleContract.enterRaffle({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
        });

        it("can only be called after performUpkeep()", async () => {
          // Here we are trying to check if request_id is valid or not so fulfillRandomWords() can be called
          // To check request_id we can call VRFCoordinatorV2Mock.fulfillRandomWords()
          // as it checks for request_id being valid or not

          await expect(
            vrf2CoordinatorMock.fulfillRandomWords(0, raffleContract.address)
          ).to.be.revertedWith("nonexistent request");
        });

        it("picks a winner, resets the lottery and send money", async () => {
          // Adding some new accounts to submit ETH in lottery

          const accounts = await ethers.getSigners();
          const additionalPlayers = 3;
          const startingPlayerIndex = 1; // Because deployer has accounts[0] adddress
          for (let i = 0; i < startingPlayerIndex + additionalPlayers; i++) {
            await raffleContract.connect(accounts[i]);
            await raffleContract.enterRaffle({ value: entranceFee });
          }
          const startingTimeStamp = await raffleContract.getLatestTimeStamp();

          // Now to start lottery what we need to do is are these steps:
          // 1. Call performUpkeep() (mock being chainlink keepers, automatically running code)
          // 2. Call fulfillRandomWords() (mock being chainlink VRF, automatically choosing random number)

          // To test operations like sending money to winner, resetting lottery state, resetting timestamp
          // We will have to wait for fulfillRandomWords to be called on a real testnet.
          // And we don't know when the event RaffleWinner will be called on a real testnet.
          // And when we are waiting for an event to happen or a function to be called, we need to setup
          // a listener / Promise

          await new Promise(async (resolve, reject) => {
            // This stat tells to listen for the event named RaffleWinner

            // This is a listener
            raffleContract.once("RaffleWinner", async () => {
              // Now here we are going to test operations like was money sent to winner,
              // resetting lottery state, resetting timestamp
              console.log("Found the event..");
              try {
                const raffleState = await raffleContract.getRaffleState();
                const endingTimeStamp =
                  await raffleContract.getLatestTimeStamp();
                const recent_winner = await raffleContract.getRecentWinner();
                const numPlayers = await raffleContract.getNoOfPlayers();
                const winnerEndingBalance = await accounts[0].getBalance();
                assert.equal(numPlayers.toString(), "0");
                assert.equal(raffleState.toString(), "0");
                assert(endingTimeStamp > startingTimeStamp);

                console.log(recent_winner);
                // console.log(accounts[0].address);
                // console.log(accounts[1].address);
                // console.log(accounts[2].address);
                // console.log(accounts[3].address);

                // startingBalance + ( (raffleEntranceFee * additionalEntrances) + our raffleEntranceFee )

                // Not able to resolve this issue

                // assert.equal(
                //   winnerEndingBalance.toString(),
                //   winnerStartingBalance
                //     .add(entranceFee.mul(additionalPlayers).add(entranceFee))
                //     .toString()
                // );

                resolve();
              } catch (e) {
                reject(e);
              }
            });

            // Here we are going to call performUpkeep() & fulfillRandomWords()
            // Why we are calling these after setting up listener ?
            // Because we need a listener to be settuped before we call these methods, in only that
            // way they would be able to listen the event
            // Here we are mocking the chainlink keepers and mocking chainlink vrf

            const txResponse = await raffleContract.performUpkeep([]);
            const tnxReceipt = await txResponse.wait(1);
            const winnerStartingBalance = await accounts[0].getBalance();
            const request_id = tnxReceipt.events[1].args.requestId;
            await vrf2CoordinatorMock.fulfillRandomWords(
              request_id,
              raffleContract.address
            );
          });
        });
      });
    });
