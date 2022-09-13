// 1. Enter the lottery (paying some amount)
// 2. Pick a random winner (Verifiably random, untampered winner)
// 3. Winner to be selected after every x minutes -> Completely automated
// For 2 and 3 we have to use: (we have to interact outside the blockchain)
// Chainlink Oracle -> Randomness, Automated Execution (Chainlink keepers)

// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.8;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

error Raffle__NotEnoughETHEntered();
error Raffle__WinnerTransferFailed();
error Raffle__LotteryNotOpen();
error Raffle_UpKeepNotNeeded(
    uint256 currentBalance,
    uint256 numPlayers,
    uint256 raffleState
);

/**@title A sample Lottery Contract
 * @author Himanshu Daswani
 * @notice This contract is for creating a truly fair randomized, automized and decentralized lottery
 * @dev This implements the Chainlink VRF Version 2 & Chainlink keepers
 */
contract Raffle is VRFConsumerBaseV2, KeeperCompatibleInterface {
    /* Type Declarations */
    enum RaffleState {
        OPEN,
        CALCULATING
    } // 0 = OPEN, 1 = CALCULATING

    /* State Variable */

    // We are using immutable because this value needs to be set only one time and can save gas
    uint256 private immutable i_enteringFee;
    // We are making this address array as payable address payable array as when one of the players win
    // we have to pay them too
    address payable[] private s_players;

    /* Events */
    event RaffleEnter(address indexed player);
    event RaffleWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winnerAddress);

    /* Chainlink VRF (Variable Randomness Function) Variables */
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_keyHash;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_gasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint16 private constant NUM_WORDS = 1;

    /* Lottery Variables */
    address private s_recentWinner;
    RaffleState private s_raffleState;
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_interval;

    constructor(
        uint256 enteringFee,
        address vrfCoordinatorV2Address,
        bytes32 keyHash, // gasLane
        uint64 subscriptionId,
        uint32 gasLimit,
        uint256 interval
    ) VRFConsumerBaseV2(vrfCoordinatorV2Address) {
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2Address);
        i_enteringFee = enteringFee;
        i_keyHash = keyHash;
        i_subscriptionId = subscriptionId;
        i_gasLimit = gasLimit;
        s_raffleState = RaffleState.OPEN;
        s_lastTimeStamp = block.timestamp;
        i_interval = interval;
    }

    function enterRaffle() public payable {
        if (msg.value < i_enteringFee) {
            // Using error codes to save gas
            revert Raffle__NotEnoughETHEntered();
        }
        if (s_raffleState != RaffleState.OPEN) {
            // checking if lottery is open then only allow players to enter lottery
            revert Raffle__LotteryNotOpen();
        }
        s_players.push(payable(msg.sender));

        // Emit an event when we update a dynamic array or mapping
        emit RaffleEnter(msg.sender);
    }

    /**
     * @dev This is the function that the chainlink keepers call.
     * They look for the `upkeepNeeded` to return true.
     * The following should return true in order to return true.
     * 1. Our time interval should have been passed.
     * 2. The lottery should have at least 1 player and some ETH.
     * 3. Our subscription should be funded with LINK.
     * 4. The lottery should be in an "open" state. When we have started the process of selecting
     * winner and we are requesting for a random number we should not allow any other players
     * to join till we select a winner.
     */

    // changed external to public so we can call it in performUpkeep()
    function checkUpkeep(
        bytes memory /*checkData*/
    )
        public
        override
        returns (
            bool upkeepNeeded,
            bytes memory /*performData*/
        )
    {
        bool isOpen = (RaffleState.OPEN == s_raffleState);
        bool timePassed = (block.timestamp - s_lastTimeStamp > i_interval);
        bool isLotteryPlayers = (s_players.length > 0);
        bool isLotterybalance = (address(this).balance > 0);
        upkeepNeeded = (isOpen &&
            timePassed &&
            isLotteryPlayers &&
            isLotterybalance);
    }

    // This function is going to request chainlink contracts for random number

    /* function requestRandomWinner() external { */
    // We renamed requestRandomWinner() to performUpkeep() because we need to request for random
    // number after we got upKeepNeeded = true from checkUpkeep() function.abi

    function performUpkeep(
        bytes calldata /* performData */
    ) external override {
        // Here we are changing the state of lottery so nobody can enter our lottery now

        (bool upkeepNeeded, ) = checkUpkeep("");

        if (!upkeepNeeded) {
            revert Raffle_UpKeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(s_raffleState)
            );
        }

        // This has to be set after we check for bool upkeepNeeded above else we will never get that to true

        s_raffleState = RaffleState.CALCULATING;

        // Request the random number
        // Once we get it, do something with it
        // 2 transaction process

        uint256 s_requestId = i_vrfCoordinator.requestRandomWords(
            i_keyHash, // maximum gas price you are willing to pay for a request in wei
            i_subscriptionId, // The subscription ID that this contract uses for funding requests
            REQUEST_CONFIRMATIONS, // How many confirmations the Chainlink node should wait before responding
            i_gasLimit, // gas limit
            NUM_WORDS
        );

        emit RaffleWinner(s_requestId);
    }

    // This second function is where we are going to get the random number and then we are going
    // to release the winning amount to winner

    // If you go to https://docs.chain.link/docs/vrf/v2/examples/get-a-random-number/#analyzing-the-contract
    // Chainlink oracles call fulfillRandomWords() function to get those random words so we are going
    // to override that function here

    function fulfillRandomWords(
        uint256, /*requestId*/
        uint256[] memory randomWords
    ) internal override {
        // Modulo function
        // s_players size 10
        // random number = 202
        // 202 % 10 what's doesn't divide evenly in 202
        // 20 * 10 = 200
        // 2

        // randomWords[0] because we are getting only one random word
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable addressOfWinner = s_players[indexOfWinner];
        s_recentWinner = addressOfWinner;

        // Reopening lottery because winner is selected now
        s_raffleState = RaffleState.OPEN;

        // Resetting players array when winner is selected
        s_players = new address payable[](0);

        // Reset timeStamp
        s_lastTimeStamp = block.timestamp;

        // Sending the contract balance to the winner
        (bool success, ) = addressOfWinner.call{value: address(this).balance}(
            ""
        );
        if (!success) {
            revert Raffle__WinnerTransferFailed();
        }
        emit WinnerPicked(addressOfWinner);
    }

    // Because we want other users to see entrance fee we are creating getter for it as we have set
    // it to private above to conserve gas

    function getEntranceFee() public view returns (uint256) {
        return i_enteringFee;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getRaffleState() public view returns (RaffleState) {
        return s_raffleState;
    }

    // Because NUM_WORDS is constant and not reading from storage we can use pure here instead of view
    function getNumWords() public pure returns (uint256) {
        return NUM_WORDS;
    }

    function getNoOfPlayers() public view returns (uint256) {
        return s_players.length;
    }

    function getLatestTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getRequestConfirmations() public pure returns (uint256) {
        return REQUEST_CONFIRMATIONS;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }
}
