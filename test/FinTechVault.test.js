const FinTechVault = artifacts.require("FinTechVault");

contract("FinTechVault", (accounts) => {
  const [alice, bob] = accounts;
  let vault;

  beforeEach(async () => {
    vault = await FinTechVault.new();
  });

  it("starts with the default notice and zero transactions", async () => {
    const [notice, total] = Object.values(await vault.getVaultStats());
    assert.equal(notice, "Welcome to the FinTech Sepolia Vault");
    assert.equal(total.toString(), "0");
  });

  it("deposits funds, updates the balance and emits FundsDeposited", async () => {
    const tx = await vault.depositFunds(100, { from: alice });
    assert.equal((await vault.getMyBalance({ from: alice })).toString(), "100");
    assert.equal(tx.logs[0].event, "FundsDeposited");
    assert.equal(tx.logs[0].args.newBalance.toString(), "100");
  });

  it("rejects a zero deposit", async () => {
    try {
      await vault.depositFunds(0, { from: alice });
      assert.fail("expected revert");
    } catch (err) {
      assert.include(err.message, "Amount must be greater than zero");
    }
  });

  it("withdraws funds and rejects overdrafts", async () => {
    await vault.depositFunds(50, { from: alice });
    await vault.withdrawFunds(20, { from: alice });
    assert.equal((await vault.getMyBalance({ from: alice })).toString(), "30");

    try {
      await vault.withdrawFunds(31, { from: alice });
      assert.fail("expected revert");
    } catch (err) {
      assert.include(err.message, "Insufficient vault balance");
    }
  });

  it("keeps balances separate per account", async () => {
    await vault.depositFunds(70, { from: alice });
    assert.equal((await vault.getMyBalance({ from: bob })).toString(), "0");
  });

  it("updates the notice and records every action in the history", async () => {
    await vault.depositFunds(10, { from: alice });
    await vault.withdrawFunds(5, { from: alice });
    await vault.updateNotice("Vault maintenance at 5pm", { from: bob });

    const [notice, total] = Object.values(await vault.getVaultStats());
    assert.equal(notice, "Vault maintenance at 5pm");
    assert.equal(total.toString(), "3");

    const history = await vault.getHistory();
    assert.equal(history.length, 3);
    assert.deepEqual(history.map((h) => h.action), ["Deposit", "Withdraw", "Notice"]);
    assert.equal(history[2].user, bob);
  });
});
