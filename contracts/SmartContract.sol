// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  FinTechVault
 * @notice Assignment 2 ledger-style vault, migrated to Truffle + Ganache (Assignment 3).
 *         Bonus features added for Assignment 3:
 *           - Events emitted for every state-changing action
 *           - On-chain transaction history readable by the frontend
 */
contract FinTechVault {
    mapping(address => uint256) private balances;
    string public vaultNotice = "Welcome to the FinTech Sepolia Vault";
    uint256 public totalTransactions = 0;

    // ---------- Bonus: transaction history ----------
    struct TxRecord {
        address user;
        string action;     // "Deposit", "Withdraw" or "Notice"
        uint256 amount;    // 0 for notice updates
        uint256 timestamp;
    }

    TxRecord[] private history;

    // ---------- Bonus: events ----------
    event FundsDeposited(address indexed user, uint256 amount, uint256 newBalance);
    event FundsWithdrawn(address indexed user, uint256 amount, uint256 newBalance);
    event NoticeUpdated(address indexed user, string newNotice);

    // 1. WRITE FUNCTION: Deposit virtual points/funds into your ledger balance
    function depositFunds(uint256 _amount) public {
        require(_amount > 0, "Amount must be greater than zero");
        balances[msg.sender] += _amount;
        totalTransactions += 1;

        history.push(TxRecord(msg.sender, "Deposit", _amount, block.timestamp));
        emit FundsDeposited(msg.sender, _amount, balances[msg.sender]);
    }

    // 2. WRITE FUNCTION: Withdraw virtual points/funds from your ledger balance
    function withdrawFunds(uint256 _amount) public {
        require(balances[msg.sender] >= _amount, "Insufficient vault balance");
        balances[msg.sender] -= _amount;
        totalTransactions += 1;

        history.push(TxRecord(msg.sender, "Withdraw", _amount, block.timestamp));
        emit FundsWithdrawn(msg.sender, _amount, balances[msg.sender]);
    }

    // 3. WRITE FUNCTION: Update the public vault status notice
    function updateNotice(string memory _newNotice) public {
        vaultNotice = _newNotice;
        totalTransactions += 1;

        history.push(TxRecord(msg.sender, "Notice", 0, block.timestamp));
        emit NoticeUpdated(msg.sender, _newNotice);
    }

    // 4. READ FUNCTION: Check caller's current vault balance
    function getMyBalance() public view returns (uint256) {
        return balances[msg.sender];
    }

    // 5. READ FUNCTION: Fetch general vault telemetry (Notice + Total Tx Count)
    function getVaultStats() public view returns (string memory, uint256) {
        return (vaultNotice, totalTransactions);
    }

    // 6. READ FUNCTION (bonus): Full on-chain transaction history
    function getHistory() public view returns (TxRecord[] memory) {
        return history;
    }
}
