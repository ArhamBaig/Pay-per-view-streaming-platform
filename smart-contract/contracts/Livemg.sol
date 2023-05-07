/* SPDX-License-Identifier: UNLICENSED */
pragma solidity ^0.8.0;

contract Livemg {
    
    struct Video {
        uint256 videoId;
        address payable owner;
        uint cost;
    }

    mapping(uint256 => Video) public videos;
    mapping(address => mapping(uint => bool)) public buyers;


    function addVideoDetail(uint256 videoId, uint cost) public {
        require(videos[videoId].videoId != videoId, "Video already exist");

        videos[videoId].videoId = videoId;
        videos[videoId].owner = payable(msg.sender);
        videos[videoId].cost = cost;
    }

    function buyVideo(uint256 videoId) public payable {
    require(msg.value >= videos[videoId].cost, "Insufficient payment, please send more Ether.");

    videos[videoId].owner.transfer(videos[videoId].cost);
    uint256 id = videos[videoId].videoId;
    buyers[msg.sender][id] = true;
    }
}