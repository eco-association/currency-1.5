# Eco Association

Copyright (c) 2023 Eco Association

## ERC20Permit

Implementation of the ERC20 Permit extension allowing approvals to be made via signatures, as defined in
[EIP-2612](https://eips.ethereum.org/EIPS/eip-2612).

Adds the {permit} method, which can be used to change an account's ERC20 allowance (see {IERC20-allowance}) by
presenting a message signed by the account. By not relying on `{IERC20-approve}`, the token holder account doesn't
need to send a transaction, and thus is not required to hold Ether at all.

_Available since v3.4._

### constructor

Initializes the {EIP712} domain separator using the `name` parameter, and setting `version` to `"2"`.

version number 1 was used already in a previous implementation

```solidity
constructor(string name) internal
```

### permit

See {IERC20Permit-permit}.

```solidity
function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) public virtual
```

### nonces

See {IERC20Permit-nonces}.

```solidity
function nonces(address owner) public view virtual returns (uint256)
```

### DOMAIN_SEPARATOR

See {IERC20Permit-DOMAIN_SEPARATOR}.

```solidity
function DOMAIN_SEPARATOR() external view returns (bytes32)
```

### _useNonce

"Consume a nonce": return the current value and increment.

_Available since v4.1._

```solidity
function _useNonce(address owner) internal virtual returns (uint256 current)
```

### _approve

Sets `amount` as the allowance of `spender` over the `owner` s tokens.

This internal function is equivalent to `approve`, and can be used to
e.g. set automatic allowances for certain subsystems, etc.

Emits an {Approval} event.

Requirements:

- `owner` cannot be the zero address.
- `spender` cannot be the zero address.

```solidity
function _approve(address owner, address spender, uint256 amount) internal virtual
```

