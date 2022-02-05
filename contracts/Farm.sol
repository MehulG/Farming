// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/interfaces/IERC20.sol";

contract Farm {
    struct txn {
        uint256 amount;
        uint256 depositTime;
        uint256 lock;
    }
    address public coin;
    address public farmToken;
    address public owner;
    mapping(address => txn) public user;

    constructor(address _coin, address _farmToken) {
        coin = _coin;
        farmToken = _farmToken;
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    function setCoin(address _coin) external onlyOwner {
        require(_coin != address(0), "_coin address can not be 0");
        coin = _coin;
    }

    function setFarmToken(address _farmToken) external onlyOwner {
        require(_farmToken != address(0), "_farmToken address can not br 0");
        farmToken = _farmToken;
    }

    //deposit can only be done once in this model, if want to deposit again, need to withdraw and deposit
    function deposit(uint256 _amount, uint256 _lockupPeriod) external {
        //lockup can be 0/6/12 months
        require(_amount > 0, "_amount should be  greater than 0");
        require(user[msg.sender].amount == 0, "already deposited");
        require(
            (_lockupPeriod == 0) ||
            (_lockupPeriod == 6) ||
            (_lockupPeriod == 12),
            "_lockupPeriod can either be 0/6/12 months"
        );
        uint256 allowance = IERC20(coin).allowance(msg.sender, address(this));
        require(allowance >= _amount, "Check the coin allowance");
        IERC20(coin).transferFrom(msg.sender, address(this), _amount);

        user[msg.sender].amount = _amount;
        user[msg.sender].depositTime = block.timestamp;
        user[msg.sender].lock = _lockupPeriod;
    }

    function withdraw() external {
        require(user[msg.sender].amount > 0, "nothing to withdraw");

        uint256 returnAmount;
        uint256 returnFarmToken;
        bool lockupOver = (block.timestamp - user[msg.sender].depositTime >=
            user[msg.sender].lock * 30 days);
        if (!lockupOver) {
            returnAmount = (user[msg.sender].amount * 90) / 100;
        } else {
            returnAmount = user[msg.sender].amount;
        }
        returnFarmToken = calculateReward(
            user[msg.sender].lock,
            user[msg.sender].amount,
            user[msg.sender].depositTime
        );
        user[msg.sender].amount = 0;
        user[msg.sender].depositTime = 0;
        user[msg.sender].lock = 0;
        IERC20(coin).transfer(msg.sender, returnAmount);
        require(
            IERC20(farmToken).balanceOf(address(this)) >= returnFarmToken,
            "Insufficient FARM balance"
        );
        IERC20(farmToken).transfer(msg.sender, returnFarmToken);
    }

    function calculateReward(
        uint256 _lockup,
        uint256 _amount,
        uint256 _depositTime
    ) internal view returns (uint256) {
        uint256 apy;
        if (_lockup == 0) {
            apy = 10;
        } else if (_lockup == 6) {
            apy = 20;
        } else if (_lockup == 12) {
            apy = 30;
        }
        return ((_amount * apy * (block.timestamp - _depositTime)) /
            (100 * 365 days));
    }
}
