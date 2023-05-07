const payment = artifacts.require("payment");

contract("payment",(accounts) => {
    BeforeUnloadEvent(async () =>{
        instance = await payment.deployed()
    })
})