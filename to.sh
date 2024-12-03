export ALICE=0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266
export DAI=0x6b175474e89094c44da98b954eedeac495271d0f
export UNLUCKY_USER=0xfc2eE3bD619B7cfb2dE2C797b96DeeCbD7F68e46
export BON=0x91dFbEE3965baAEE32784c2d546B7a0C62F268c9
export BOB=0x1dE1898F97b8EDB95cA1f218B9dD0Ebe2B7B6786
export B1=0x91dFbEE3965baAEE32784c2d546B7a0C62F268c9
export USDT=0xdAC17F958D2ee523a2206206994597C13D831ec7
export USER=0xD3D179c9E79f6bCc20E7867528B0f0Cb4b2Cd703

cast call $USDT \
  "balanceOf(address)(uint256)" \
  $USER

cast call $USDT \
  "balanceOf(address)(uint256)" \
  $USDT

cast rpc anvil_impersonateAccount 0x3451B6b219478037a1AC572706627FC2BDa1e812

cast send $USDT \
--from 0x3451B6b219478037a1AC572706627FC2BDa1e812 \
  "transfer(address,uint256)(bool)" \
  $ALICE \
  300000000000000000000000 \
  --unlocked \
  --gas-limit=4500000

cast rpc anvil_impersonateAccount $USER

cast send $USDT \
--from $USER \
  "transfer(address,uint256)(bool)" \
  $ALICE \
  300000000000000000000000 \
  --unlocked \
  --gas-limit=30000

cast call $BON \
  "balanceOf(address)(uint256)" \
  $B1

cast call $BON \
  "balanceOf(address)(uint256)" \
  $B1

cast call $BON \
  "balanceOf(address)(uint256)" \
  $BON

cast call $BON \
  "balanceOf(address)(uint256)" \
  $ALICE

cast call $BON \
  "balanceOf(address)(uint256)" \
  $UNLUCKY_USER

cast call $DAI \
  "balanceOf(address)(uint256)" \
  $ALICE

  cast call $DAI \
  "balanceOf(address)(uint256)" \
  $UNLUCKY_USER

cast rpc anvil_impersonateAccount $UNLUCKY_USER


 cast send $DAI \
--from $UNLUCKY_USER \
  "transfer(address,uint256)(bool)" \
  $ALICE \
  300000000000000000000000 \
  --unlocked \
  --gas-limit=30000

  cast call $DAI \
  "balanceOf(address)(uint256)" \
  $ALICE

  cast call $DAI \
  "balanceOf(address)(uint256)" \
  $UNLUCKY_USER