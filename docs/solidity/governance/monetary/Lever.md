# Eco Association

Copyright (c) 2023 Eco Association

## Lever

### authorized

```solidity
mapping(address => bool) authorized
```

### notifier

```solidity
contract Notifier notifier
```

### AuthorizedOnly

```solidity
error AuthorizedOnly()
```

### AuthorizationChanged

```solidity
event AuthorizationChanged(address agent, bool status)
```

### NotifierChanged

```solidity
event NotifierChanged(contract Notifier oldNotifier, contract Notifier newNotifier)
```

### onlyAuthorized

```solidity
modifier onlyAuthorized()
```

### constructor

```solidity
constructor(contract Policy _policy) public
```

### setAuthorized

```solidity
function setAuthorized(address _agent, bool _status) public
```

Changes the authorized status of an address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _agent | address | The address whose status is changing |
| _status | bool | The new status of _agent |

### setNotifier

```solidity
function setNotifier(contract Notifier _notifier) public
```

Changes the notifier for the lever.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _notifier | contract Notifier | The new notifier address |
