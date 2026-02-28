// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CasinoBank {
    address public immutable admin;
    uint256 public houseReserve;

    struct Player {
        uint256 initialDeposit;
        uint256 balance;
        uint256 totalWagered;
        bool exists;
    }

    mapping(address => Player) public players;
    uint256 private unlocked = 1;

    event Deposited(address indexed player, uint256 amount);
    event Wagered(address indexed player, uint256 amount);
    event Withdrawn(address indexed player, uint256 amount);
    event PayoutSettled(address indexed player, uint256 amount);
    event HouseFunded(uint256 amount);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier nonReentrant() {
        require(unlocked == 1, "Reentrancy blocked");
        unlocked = 0;
        _;
        unlocked = 1;
    }

    constructor() {
        admin = msg.sender;
    }

    function deposit() external payable {
        require(msg.value > 0, "Deposit must be > 0");

        Player storage player = players[msg.sender];

        if (!player.exists || player.balance == 0) {
            player.initialDeposit = msg.value;
            player.totalWagered = 0;
            player.exists = true;
        }

        player.balance += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function wager(uint256 amount) external {
        require(amount > 0, "Wager must be > 0");

        Player storage player = players[msg.sender];
        require(player.balance >= amount, "Insufficient player balance");

        player.balance -= amount;
        player.totalWagered += amount;
        houseReserve += amount;

        emit Wagered(msg.sender, amount);
    }

    function settlePayout(address playerAddress, uint256 amount) external onlyAdmin {
        require(amount > 0, "Payout must be > 0");
        require(address(this).balance >= amount, "Contract underfunded");

        Player storage player = players[playerAddress];
        require(player.exists, "Player missing");

        if (houseReserve >= amount) {
            houseReserve -= amount;
        }

        player.balance += amount;
        emit PayoutSettled(playerAddress, amount);
    }

    function withdraw(uint256 amount) external nonReentrant {
        require(amount > 0, "Withdraw must be > 0");

        Player storage player = players[msg.sender];
        require(player.exists, "Player missing");
        require(player.balance >= amount, "Insufficient player balance");
        require(player.totalWagered >= player.initialDeposit * 20, "Must wager 20x initial deposit first");

        player.balance -= amount;

        (bool sent, ) = msg.sender.call{value: amount}("");
        require(sent, "ETH transfer failed");

        emit Withdrawn(msg.sender, amount);
    }

    function fundHouse() external payable onlyAdmin {
        require(msg.value > 0, "Funding must be > 0");
        houseReserve += msg.value;
        emit HouseFunded(msg.value);
    }

    function emergencyHouseWithdraw(uint256 amount, address payable to) external onlyAdmin nonReentrant {
        require(to != address(0), "Bad receiver");
        require(amount > 0, "Amount must be > 0");
        require(address(this).balance >= amount, "Not enough ETH");

        if (houseReserve >= amount) {
            houseReserve -= amount;
        }

        (bool sent, ) = to.call{value: amount}("");
        require(sent, "ETH transfer failed");
    }

    function getPlayer(address playerAddress)
        external
        view
        returns (uint256 initialDeposit, uint256 balance, uint256 totalWagered, bool exists)
    {
        Player memory player = players[playerAddress];
        return (player.initialDeposit, player.balance, player.totalWagered, player.exists);
    }
}
