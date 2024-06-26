// Author: santiago93echevarria@gmail.com
// 
// Chrome Extension to help keep track of Colonist resource exchanges
//

// ----------------------------  GLOBALS ------------------------------------ //

let USER_COLORMAP = {};
let RESOURCES_DATA = {}; // User resources map

let LUMBR = "lumber"
let BRICK = "brick"
let GRAIN = "grain"
let WOOL = "wool"
let ORE = "ore"
let UNKWN_CARD = "card"
let LOG_WRAPPER_ID = "game-log-text"

let RESOURCES_LIST = [LUMBR, BRICK, GRAIN, WOOL, ORE, UNKWN_CARD]; //rescardback
let MY_USERNAME = "";

let is_monopoly = false; // Aux variable for parsing monopoly log
let is_active = false

// --------------------  Build initial HTML containers  --------------------- //
const topBar = document.createElement("div"); // Create top bar
topBar.classList.add("top-bar");

const user_info_wrapper = document.createElement("div"); // Div for data display
user_info_wrapper.classList.add("user-div-wp")

topBar.appendChild(user_info_wrapper);
document.body.insertBefore(topBar, document.body.firstChild);
// -------------------------------------------------------------------------- //

observeDOM();

function observeDOM() {

    const targetId = LOG_WRAPPER_ID; 

    const observer = new MutationObserver((mutationsList) => {
        for (let mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                for (let node of mutation.addedNodes) {
                    if (node.nodeType === 1 && node.id === targetId) {
                        activate();
                        observer.disconnect(); 
                        break;
                    }
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

function activate() {
    // Activate funtion. Needs to called after logs div has loaded
    setUsername()
    removeAds();
    if (!is_active) {
        startLogObserver();
    }
}

function setUsername() {
    MY_USERNAME = document.getElementById('header_profile_username').innerText;
    console.log(`username = ${MY_USERNAME}`);
}

function removeAds() {
    // Need to clean adds to place data. Also.. who likes ads?
    document.getElementById("in_game_ab_left").style.display = "none";
    document.getElementById("in_game_ab_right").style.display = "none";
    document.getElementById("in_game_ab_bottom").style.display = "none";
    document.getElementById("in_game_ab_bottom_small").style.display = "none";
}

function startLogObserver() {
    // Refresh data on changes on log element 
    const targetNode = document.getElementById(LOG_WRAPPER_ID);
    const observer = new MutationObserver(function (mutationsList, observer) {
        for (let mutation of mutationsList) {
            if (mutation.type === "childList") {
                const content = targetNode.innerHTML;
                refreshData();
            }
        }
    });
    const config = { attributes: true, childList: true, subtree: true };
    observer.observe(targetNode, config);
    is_active = true
    button.style.display = "none"
}

function refreshData() {
    // Calculate all user data

    RESOURCES_DATA = {}; // Reset all data
    let content = document.getElementById(LOG_WRAPPER_ID);

    for (let i = 0; i < content.childNodes.length; i++) {
        const child = content.children[i];

        let actions = parseMsg(child); // A message (log item) is a collection of actions to take

        // action interpretation
        for (let j = 0; j < actions.length; j++) {

            let user = actions[j][0]; // Who to modify resources to
            let operation = actions[j][1]; // "+" adds 1; "-1" deducts 1; <number> adds that value (only for monopoly)
            let resource = actions[j][2]; //

            if (user) {
                if (!(user in RESOURCES_DATA)) {
                    RESOURCES_DATA[user] = {
                        ore: 0, wool: 0, brick: 0, grain: 0, lumber: 0, card: 0,
                    };
                }
            }
            //
            if (operation == "+") {
                RESOURCES_DATA[user][resource] += 1;
                // console.log([user, "+1", resource]);
            } else if (operation == "-") {
                RESOURCES_DATA[user][resource] -= 1;
                //console.log([user, "-1", resource]);
            } else if (typeof operation == "number") {
                let amount = operation; // for monopoly operation is the number
                RESOURCES_DATA[user][resource] += amount;
                //console.log([user, `+${amount}`, resource]);

                for (let user2 in RESOURCES_DATA) {
                    if (user2 != user) {
                        RESOURCES_DATA[user2][resource] = 0;
                        //      console.log([user2, "=0", resource]);
                    }
                }
            }
        }
    }
    //    console.log(data);
    buildChart();
}

function buildChart() {
    // Build graphical display of resources


    user_info_wrapper.innerHTML = ""; // Needs to be cleared each time. Calculation is the sum of all logs
    Object.keys(RESOURCES_DATA).forEach((user) => {

        if (user != MY_USERNAME) {
            // A div per user
            let user_data = RESOURCES_DATA[user];
            let userdiv = document.createElement("div");
            let user_hr = document.createElement("div");
            userdiv.classList.add("user-div")

            user_hr.innerText = user;
            user_hr.classList.add("user-div-hr")

            let user_color = USER_COLORMAP[user];
            user_hr.style.color = user_color

            userdiv.appendChild(user_hr);
            for (i = 0; i < RESOURCES_LIST.length; i++) {

                let resource_div = document.createElement("div");
                resource_div.classList.add("resource-div")

                let r_img = document.createElement("img");
                r_img.classList.add("r_div_img")

                let r_span = document.createElement("span");
                r_span.classList.add("r_div_span")
                let n = user_data[RESOURCES_LIST[i]];

                // UNKWN_CARD resource is special since actual resource is not shown. 
                // Whan cards are used the calculation can be wrong. but this gives sense of error margins
                if (RESOURCES_LIST[i] == UNKWN_CARD) {
                    r_img.setAttribute("src", `/dist/images/card_rescardback.svg`);
                    r_span.style.color = 'black';
                    r_span.innerText = `${(n < 0 ? "" : "+") + n}`;
                    (n < 0 ? "" : "+") + n // Show sign alwys
                } else {
                    r_img.setAttribute("src", `/dist/images/card_${RESOURCES_LIST[i]}.svg`);
                    r_span.innerText = `    ${n}`;
                }

                resource_div.appendChild(r_img);
                resource_div.appendChild(r_span);
                userdiv.appendChild(resource_div);
                // Only show existing
                if (user_data[RESOURCES_LIST[i]] == 0) {
                    r_span.innerText = ""
                }
            }
            // Add updated chart
            user_info_wrapper.append(userdiv);
        }
    });
}

function parseMsg(htmlMsg) {
    //
    // Return [(user, '+', resource), ...]
    var actions = [];
    try {
        let msgCtn = htmlMsg.childNodes[1].childNodes;
        var user = htmlMsg.children[1].children[0].innerText.trim(); // no funciona para You Stole
        USER_COLORMAP[user] = htmlMsg.children[1].children[0].style.color

        if (is_monopoly) {
            is_monopoly = false;
            let resource = msgCtn[2].alt;
            let amount = parseInt(msgCtn[1].textContent.replace("stole", "").trim());

            actions.push([user, amount, resource]);
        } else if (htmlMsg.innerText.trim().startsWith("You stole")) {
            // You steal TODO: identify user mapping

            let stoled = msgCtn[3].innerText;
            let resource = msgCtn[1].alt;

            actions.push([MY_USERNAME, "+", resource]);
            actions.push([stoled, "-", resource]);
        } else {
            let activity = msgCtn[1].textContent.trim();

            if (activity == "received starting resources") {
                // beginning
                for (let i = 2; i < msgCtn.length; i++) {
                    let resource = msgCtn[i].alt;
                    actions.push([user, "+", resource]);
                }
            } else if (activity == "used") {
                let used_card = msgCtn[2].innerText.trim();
                if (used_card == "Monopoly") {
                    is_monopoly = true;
                }
            } else if (activity == "got" || activity == "took from bank") {
                // by dice or Year of plenty
                for (let i = 2; i < msgCtn.length; i++) {
                    let resource = msgCtn[i].alt;
                    actions.push([user, "+", resource]);
                }
            } else if (activity == "discarded") {
                // discard by 7
                for (let i = 2; i < msgCtn.length; i++) {
                    let resource = msgCtn[i].alt;
                    actions.push([user, "-", resource]);
                }
            } else if (activity == "gave bank") {
                // bank trade
                let op = "-";
                for (let i = 2; i < msgCtn.length; i++) {

                    if (msgCtn[i].textContent.trim() == "and took") {
                        op = "+";
                    } else {
                        let resource = msgCtn[i].alt;
                        actions.push([user, op, resource]);
                    }
                }
            } else if (activity == "traded") {
                // Player trade
                let l = parseInt(msgCtn.length) - 1;
                let user2 = msgCtn[l].innerText;

                let taker = user;
                let giver = user2;

                for (let i = 2; i < msgCtn.length - 1; i++) {
                    if (msgCtn[i].nodeType == 3) {
                        taker = user2;
                        giver = user;
                    } else {
                        let resource = msgCtn[i].alt;

                        actions.push([taker, "-", resource]);
                        actions.push([giver, "+", resource]);
                    }
                }
            } else if (activity == "bought") {
                // buy dev card
                let b_item = msgCtn[2].alt;
                if (b_item == "development card") {
                    actions.push([user, "-", WOOL]);
                    actions.push([user, "-", GRAIN]);
                    actions.push([user, "-", ORE]);
                }
            } else if (activity == "built a") {
                // Build infra
                let b_item = msgCtn[2].alt;
                if (b_item == "road") {
                    actions.push([user, "-", LUMBR]);
                    actions.push([user, "-", BRICK]);
                } else if (b_item == "city") {
                    actions.push([user, "-", GRAIN]);
                    actions.push([user, "-", GRAIN]);
                    actions.push([user, "-", ORE]);
                    actions.push([user, "-", ORE]);
                    actions.push([user, "-", ORE]);
                } else if (b_item == "settlement") {
                    actions.push([user, "-", LUMBR]);
                    actions.push([user, "-", BRICK]);
                    actions.push([user, "-", WOOL]);
                    actions.push([user, "-", GRAIN]);
                }
            } else if (activity == "stole") {
                let resource = msgCtn[2].alt;

                if (msgCtn.length == 4) {
                    // stole you o You stol
                    actions.push([user, "+", resource]);
                    actions.push([MY_USERNAME, "-", resource]);
                } else {
                    let stoled = msgCtn[4].innerText;

                    actions.push([user, "+", resource]);
                    actions.push([stoled, "-", resource]);
                }
            }
        }
    } catch (e) { }

    return actions;
}


