$(document).ready(function () {
    // needed to initialize form select for Materialize
    $('select').formSelect();

    //====================== GLOBAL VARIABLES ==========================================
    var topic = "";
    var difficulty = "easy";
    var timer = 0;
    var score = 0;
    var matchesLeft = 0;
    var cardOne;
    var cardsClicked = 0;
    var timeBonusFactor = 1;
    var photoArray = [];
    var numCols = 0;
    var numRows = 0;
    var boardType = "";

    //============================ LEADERBOARD SET UP ===============================
    //save data to local storage
    function saveScore(entry) {
        if (localStorage[difficulty]) {
            var existingLocalStorage = localStorage.getItem(difficulty);
            var structuredData = JSON.parse(existingLocalStorage);
            structuredData.push(entry)
            var str = JSON.stringify(structuredData);
            localStorage.setItem(difficulty, str)
        } else {
            var str = JSON.stringify([entry]);
            localStorage.setItem(difficulty, str);
        }
    }

    // add user score to leaderboard
    function addScore(name, userScore) {
        var entry = new Entry(name, userScore);
        saveScore(entry);

        function Entry(name, userScore) {
            this.name = name;
            this.score = userScore;
        }
    }

    // get the leaderboard for the right difficulty level
    function getLeaderboard(currentDifficulty) {
        var str = localStorage.getItem(currentDifficulty);
        entries = JSON.parse(str);
        if (!entries) {
            entries = [];
        }

        function dynamicSort(property) {
            var sortOrder = -1;
            if (property[0] === "-") {
                sortOrder = 1;
                property = property.substr(1);
            }
            return function (a, b) {

                var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
                return result * sortOrder;
            }
        }
        entries.sort(dynamicSort("score"));
    }

    // creates a new row in the leaderboard table with the data set
    function createRow(rank, userName, userScore) {
        var newTag = $("<tr>");
        var newTagUserrank = $("<td>").text(rank);
        var newTagUsername = $("<td>").text(userName);
        var newTagUserscore = $("<td>").text(userScore);
        newTag.append(newTagUserrank, newTagUsername, newTagUserscore);
        return newTag;
    }

    // display top 10 scores on leaderboard from hall of fame button
    // on landing
    function displayHOFLeaderboard() {
        var leaderBoard = $("#leaderboardRows");
        leaderBoard.empty();
        let rank = 1;

        // only displays the top 10 users
        for (var i = 0; i < entries.length; i++) {
            var entry = entries[i];
            var userName = entry.name;
            var userScore = entry.score;

            leaderBoard.append(createRow(rank, userName, userScore));

            // put equal scores as the same ranking
            if (i !== (entries.length - 1) && userScore !== entries[i + 1].score) {
                rank++;
            }

            if (rank === 11) {
                break;
            }
        }
    }

    // leaderboard to be displayed after the game is ended
    function displayEndGameLeaderboard() {
        var leaderBoard = $("#leaderboardRows");
        leaderBoard.empty();
        let rank = 1;
        var isUserDisplayed = false;
        var isHighlighted = false;

        for (var i = 0; i < entries.length; i++) {
            var entry = entries[i];
            var userName = entry.name;
            var userScore = entry.score;

            // checks if current entry is the same as the user
            if (userName === $("#name").val() && userScore === score) {
                isUserDisplayed = true;
            }

            // only append a row to the leaderboard if it's the top
            // 10 scores or only the user's score if the rank
            // has reached past 10
            if (rank <= 10 || isUserDisplayed) {
                var row = createRow(rank, userName, userScore);
                // highlights the user's score
                if (isUserDisplayed && !isHighlighted) {
                    row.css("background", "rgba(46, 139, 86, 0.8)");
                    isHighlighted = true;
                }
                leaderBoard.append(row);
            }

            // puts equal scores on equal ranking
            if (i !== (entries.length - 1) && userScore !== entries[i + 1].score) {
                rank++;
            }

            // makes sure to exit loop after the user has been displayed
            // and there's at least the top 10 rankings showing
            if (isUserDisplayed && rank >= 11) {
                break;
            }
        }
    }

    // for hall of fame button on landing, if user does npt
    // choose an option the easy leaderboard will be displayed
    function displayHOF() {
        var userChoice = $("#lbOptions").val();
        // if no option chosen, display easy leaderboard
        if (userChoice === null) {
            getLeaderboard("easy");
        }
        else {
            getLeaderboard(userChoice);
        }
        displayHOFLeaderboard();
    }

    // called when user submits name
    function submitScore() {
        var currentUser = $("#name").val();
        var currentScore = score;
        addScore(currentUser, currentScore);
        getLeaderboard(difficulty);
        displayEndGameLeaderboard();

        $("#end").addClass("hide");
        $("#leaderboard").removeClass("hide");
        $("#lbOptionsRow").addClass("hide");
    }

    //========================= GAME SET UP ===================================
    // gets the APIs for the topic user chose
    function setGameTopic(numCards) {
        switch (topic) {
            case "dogs":
                getPexelsDog(numCards);
                break;
            case "cats":
                getCat(numCards);
                break;
            default:
                getLandscape(numCards);
                break;
        }
    }

    // sets all the values needed to 
    // start up the game
    function setGame() {
        // user's chosen difficulty
        userDifficulty = $("#difficulty").val();
        if (userDifficulty !== null) {
            difficulty = userDifficulty;
        }

        // user's chosen topic
        topic = $("#topic").val();

        switch (difficulty) {
            case "moderate":
                timer = 150;    // 5x4: timer/matchesLeft === 15 seconds per match allowed
                matchesLeft = 10;
                numCols = 5;
                numRows = 4;
                boardType = "fiveByFour";
                timeBonusFactor = 2;
                break;
            case "hard":
                timer = 150;    // 6x5: timer/matchesLeft === 10 seconds per match allowed
                matchesLeft = 15;
                numCols = 6;
                numRows = 5;
                boardType = "sixByFive";
                timeBonusFactor = 3;
                break;
            default:
                timer = 120;    // 4x3: timer/matchesLeft === 20 seconds per match allowed
                matchesLeft = 6;
                numCols = 4;
                numRows = 3;
                boardType = "fourByThree";
                timeBonusFactor = 1;
                break;
        }
        setGameTopic(numCols * numRows);
    }

    // start game timer
    function startGame() {
        // starts timer and displays the time every second
        var timerInterval = setInterval(function () {
            timer--;
            $("#timer").text(timer);

            // if the user exits midgame back to the landing
            // clear the timer
            if ($("#game").hasClass("hide")) {
                clearInterval(timerInterval);
            }
            else if (timer === 0 || matchesLeft === 0) {
                clearInterval(timerInterval);
                loadEndPage();
            }
        }, 1000);
    }

    // makes a new card in the grid
    function makeCard(newRow, pos) {
        var col = $(`<div class='col ${boardType}'>`);
        var card = $("<div class='card'>");
        var cardFront = $("<div class='front'>");
        var cardBack = $("<div class='back card-image'>");
        var newImg = $(`<img src="${photoArray[pos]}" alt="card pic">`);
        newImg.attr("data-board-position", pos); // for evaluating if the user is clicking the same card
        cardBack.append(newImg);
        card.append(cardFront, cardBack);
        col.append(card);
        newRow.append(col);
        $(card).flip({
            trigger: 'manual'
        });
    }

    // display the right amount of rows and colmumns 
    // filled with cards
    function makeGameBoard() {
        // keep position in photoArray
        var pos = 0;

        // for each row create all the cards, and
        // then append it to the cardsContainer
        for (var i = 0; i < numRows; i++) {
            var newRow = $("<div class='row cardRow'>");
            for (var j = 0; j < numCols; j++) {
                makeCard(newRow, pos);
                pos++;
            }
            $("#cardsContainer").append(newRow);
        }

        // timer for the overlay countdown, starts
        // as soon as the game board has been loaded
        var secondsLeft = 3;
        var timerInterval = setInterval(function () {
            $("#countdown").text(secondsLeft);
            if (secondsLeft === 0) {
                clearInterval(timerInterval);
                $("#overlay").addClass("hide");
                startGame();
            }
            secondsLeft--;
        }, 1000);
    }

    // shuffles the URLs in the array so that the 
    // matching pictures aren't next to each other
    function shuffleArray(array) {
        // goes through each element in the array
        // and randomly switches it's place
        // with another element
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * i)
            const temp = array[i]
            array[i] = array[j]
            array[j] = temp
        }
    }

    function evaluateMatch(cardTwo) {
        // this is the second card, let's compare with the first
        var cardTwoIndex = cardTwo.find("img").data("board-position");
        var cardOneIndex = cardOne.find("img").data("board-position");
        var cardOneID = cardOne.find("img").attr("src");
        var cardTwoID = cardTwo.find("img").attr("src");

        // console.log(`evaluateMatch cardOne ${cardOneIndex} cardTwo ${cardTwoIndex}`);

        if (cardOneIndex === cardTwoIndex) {
            // ignore when the user is just clicking the same picture repeatedly
            // console.log("cardsClicked: " + cardsClicked + " user flipped the same card again: " + cardOneID);
            cardOne.flip(false);
            cardsClicked = 0;
            return;
        } else if (cardOneID === cardTwoID) {
            // a match, add some points!
            score += 5;
            matchesLeft--;
            
            // and keep the cards from flipping again
            cardOne.addClass("locked");
            cardTwo.addClass("locked");
        } else {
            // uh-oh, lose some points
            score -= 1;
            
            // flip the cards back for another try
            cardTwo.flip(false);
            cardOne.flip(false);
        }

        // whether it was a match or not, begin again with first card
        cardsClicked = 0;

        // update on-screen score
        $("#score").text(score);
    }

    function checkCardSelection() {
        // don't evaluated, or flip, already matched cards
        if ($(this).hasClass("locked")) {
            // console.log("cardsClicked: " + cardsClicked + " card is locked: " + $(this).find("img").data("board-position"));
            return;
        }

        // increment a card counter and show the picture if card one or card two
        cardsClicked++;
        if (cardsClicked < 3) {
            // console.log("cardsClicked: " + cardsClicked + " flip this card: " + $(this).find("img").data("board-position"));
            $(this).flip(true);
        }

        var thisIsThis = $(this);

        // if cardsClicked === 2, evaluate for a match
        if (cardsClicked === 2) {
            // delay the start of evaluation so the second card is visible to the user
            // 1000 ms was too long, 500 ms was not quite long enough to show the whole image
            setTimeout(function () {
                evaluateMatch(thisIsThis);
            }, 700); 
        } else if (cardsClicked === 1) {
            cardOne = thisIsThis;
        }
    }

    //================== PAGE DISPLAYS ============================
    // hide everything on the page and display
    // the nav, game container, score, and timer 
    function loadGamePage() {
        $("#landing").addClass("hide");
        $("#hof").addClass("hide");
        $("nav").removeClass("hide");
        $("#game").removeClass("hide");

        setGame();
        $("#timer").text(timer);
        $("#score").text(score)
    }

    // reset all values so it's ready
    // for when the game is played again
    function reset() {
        score = 0;
        timer = 0;
        matchesLeft = 0;
        // isCardOne = true;
        cardsClicked = 0;
        timeBonusFactor = 1;
        topic = "";
        difficulty = "easy";
        photoArray = [];
        $(".card").removeClass("locked");
        $("#overlay").removeClass("hide");
        $("#back").removeClass("hide");
        $("#cardsContainer").empty();
        $("#topic").prop("selectedIndex", 0);
        $("#difficulty").prop('selectedIndex', 0);
        $("#lbOptions").prop('selectedIndex', 0);
        $('select').formSelect();
    }

    // load landing page coming from game or leaderboard
    function loadLanding() {
        reset();
        $("#leaderboard").addClass("hide");
        $("nav").addClass("hide");
        $("#hof").removeClass("hide");
        $("#landing").removeClass("hide");
    }

    // loads end page and displays their final score
    function loadEndPage() {
        $("#game").addClass("hide");
        $("#back").addClass("hide");
        $("#end").removeClass("hide");

        if (timer === 0) {
            $("#endMessage").text("Time is up!");
        }
        else {
            $("#endMessage").text("You won!");
        }
        $("#finalScore").text(score);
        displayFinalScore();
    }

    function displayFinalScore() {
        if(timer === 0){
            // just display the current score as-is, no time bonus will be applied
            $("#finalScore").text(score);
        } else {
            // give this player some bonus!
            var baseScore = score;
            var timeBonus = timer * timeBonusFactor;
            score = baseScore + timeBonus;
            var bonusMsg = $("<br><small>").text(`(That's a +${timeBonus} Time Bonus!)`);
            $("#finalScore").text(score);
            $("#finalScore").append(bonusMsg);
        }
    }

    //====================================== API CALLS =========================================
    function getCat(numCards) {
        catUrl = "https://api.thecatapi.com/v1/images/search?limit=15&apikey=5767aba7-30b0-4677-a169-9bd06be152b8";

        $.ajax({
            url: catUrl,
            method: "GET"
        }).then(function (response) {
            // since the cards come in pairs, only need to get
            // pictures for half the number of cards and
            // push it twice into the array
            for (var i = 0; i < numCards / 2; i++) {
                photoArray.push(response[i].url);
                photoArray.push(response[i].url);
            }

            shuffleArray(photoArray);
            makeGameBoard();
        });
    }

    function getPexelsDog(numCards) {
        var rand = Math.floor(Math.random() * 200 + 1);
        pexelsUrl = "https://api.pexels.com/v1/search?query=dogs+query&per_page=15&page=" + rand;

        $.ajax({
            url: pexelsUrl,
            headers: { "Authorization": "563492ad6f9170000100000189da3e3e71c041369167af3e07e5a355" },
            method: "GET",
            type: "text/json"
        }).then(function (response) {
            for (var i = 0; i < numCards / 2; i++) {
                photoArray.push(response.photos[i].src.original);
                photoArray.push(response.photos[i].src.original);
            }

            shuffleArray(photoArray);
            makeGameBoard();
        });

    }

    function getLandscape(numCards) {
        var rand = Math.floor(Math.random() * 200 + 1);
        pexelsUrl = "https://api.pexels.com/v1/search?query=landscape+query&per_page=15&page=" + rand;

        $.ajax({
            url: pexelsUrl,
            headers: { "Authorization": "563492ad6f9170000100000189da3e3e71c041369167af3e07e5a355" },
            method: "GET",
            type: "text/json"
        }).then(function (response) {
            for (var i = 0; i < numCards / 2; i++) {
                photoArray.push(response.photos[i].src.original);
                photoArray.push(response.photos[i].src.original);
            }

            shuffleArray(photoArray);
            makeGameBoard();
        });
    }

    //======================= EVENT LISTENERS =========================
    $(document).on("click", ".card", checkCardSelection);
    $("#start").click(loadGamePage);
    $("#home").click(loadLanding);
    $("#submit").click(submitScore);
    $("#back").click(function () {
        $("#game").addClass("hide");
        loadLanding();
    });

    $(".brand-logo").click(function () {
        $("#game").addClass("hide");
        loadLanding();
    });

    // if someone wants to sumbit their name by pressing enter
    $("#name").keyup(function (event) {
        if (event.keyCode === 13) {
            submitScore();
        }
    });

    $("#hof").click(function () {
        $("#landing").addClass("hide");
        $("#leaderboard").removeClass("hide");
        $("#lbOptionsRow").removeClass("hide");
        displayHOF();
    });

    $("#lbOptions").change(displayHOF);
});