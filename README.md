# ⏳ Aeon Vaults - User Guide

Welcome to **Aeon Vaults**, a decentralized application (DApp) on the **Arc Testnet** designed to help you save money using time-locked smart contracts.  
This guide will walk you through how to use the interface to manage your savings goals.

---

## 1. Connecting Your Wallet

To interact with Aeon Vaults, you need a Web3 wallet (like **MetaMask** or **Rabby**) configured for the **Arc Testnet**.

1. Click the **"Connect Wallet"** button in the top right corner or the center of the screen.  
2. Approve the connection in your wallet pop-up.  
3. **Sign the Message:** You will be asked to sign a message to verify ownership. This is free *(gasless)* and secure.  
4. **Network Check:** If you are not on the Arc Testnet, the app will display a **"Wrong Network"** alert.  
   Click **"Switch to Arc Testnet"** to automatically change networks.

---

## 2. Creating a Savings Goal (Vault)

A **Vault** is a secure smart contract where your funds are locked until a specific date.

1. Locate the **"New Savings Goal"** panel on the left side.  
2. **Select Asset:** Choose between **USDC** or **EURC** as your savings currency.  
3. **Vault Name:** Give your vault a personal name (e.g., *"New Car"*, *"Holiday Fund"*).  
   > Note: This name is stored on Firebase.  
4. **Initial Deposit:** Enter the amount you want to lock immediately.  
5. **Unlock Date:** Select the date when you want the funds to become available.  
   > ⚠️ You cannot withdraw funds for free before this date.  
6. Click **"Create Locked Vault"**.  
7. Confirm the **Approval transaction** (if needed) and the **Create transaction** in your wallet.

---

## 3. Managing Your Vaults

Your active vaults are listed on the right side under **"My Active Goals"**.

- **Locked Status:** Shows how many days are left until maturity.  
- **Balance:** Displays the current amount stored in the vault.  
- **Asset Icon:** Indicates if the vault holds **USDC (Blue)** or **EURC (Indigo)**.

---

## 4. Adding More Funds

You can top up an existing vault at any time.

1. Click the **"Save More"** button on the specific vault card.  
2. Enter the amount you wish to add.  
3. Click the **Trending Up Icon (Deposit button)**.  
4. Confirm the transaction in your wallet.

---

## 5. Withdrawing Funds

There are two ways to withdraw your money, depending on the current date relative to the **Unlock Date**.

### A. Standard Withdrawal *(Maturity Reached)*

If the Unlock Date has passed:

- The lock icon will change to an **Unlock** icon.  
- The button will say **"Withdraw Total Balance"**.  
- Click it to withdraw **100% of your funds + any generated yield (if applicable)** back to your wallet.  
- No fees are charged for standard withdrawals.

---

### B. Emergency Withdrawal *(Early Exit)*

If you urgently need funds before the Unlock Date, you can use the **Emergency Withdrawal** feature.  
However, penalties apply.

1. Click the small red text **"Need emergency funds?"** inside the vault card.  
2. Review the penalty calculation displayed on the screen.  
3. Click **"Confirm & Withdraw"** if you agree to the terms.

---

### ⚠️ Fees & Penalties (Emergency Only)

The penalty system is designed to encourage saving.  
It only applies if you withdraw **before the Unlock Date**.

- **Small Amounts (≤ 50.00):** A **10% penalty** is deducted from the principal.  
- **Large Amounts (> 50.00):** A **fixed penalty of 50.00 (USDC/EURC)** is deducted.

**Example:**

| Action | Withdrawal | Penalty | You Receive |
|---------|-------------|----------|---------------|
| Withdrawing 40.00 early | 4.00 | 10% | 36.00 |
| Withdrawing 1,000.00 early | 50.00 | Fixed | 950.00 |

---

**Powered by Arc Testnet**

