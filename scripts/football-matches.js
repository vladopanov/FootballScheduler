function startApp() {
    const kinveyBaseUrl = "https://baas.kinvey.com/";
    const kinveyAppKey = "kid_BkYeq_3mg";
    const kinveyAppSecret = "f793fbfdc5fd441d9c439747176092e2";
    const kinveyAppAuthHeaders = {
        'Authorization': `Basic ${btoa(kinveyAppKey + ":" + kinveyAppSecret)}`
    };

    //localStorage.clear(); // Clear user auth data
    $.noty.defaults.timeout = 3000;
    showHideMenuLinks();
    showView('viewHome');
    // Bind the navigation menu links
    $("#linkHome").click(showHomeView);
    // Bind the form submit actions
    $("#formLogin").submit(loginUser);
    $("#formRegister").submit(registerUser);
    $("form").submit(function(e) { e.preventDefault(); });

    // Bind the navigation menu links
    $("#linkHome").click(showHomeView);
    $("#linkLogin").click(showLoginView);
    $("#linkRegister").click(showRegisterView);
    $("#linkListPlayers").click(listPlayers);
    $("#linkLogout").click(logoutUser);

// Bind the form submit buttons
    $("#buttonLoginUser").click(loginUser);
    $("#buttonRegisterUser").click(registerUser);

// Attach AJAX "loading" event listener
    let loadingMsg;
    $(document).on({
        ajaxStart: function() { loadingMsg = noty({text: "Loading...", type: "alert"});},
        ajaxStop: function() { loadingMsg.close(); }
    });

    function showHideMenuLinks() {
        $("#linkHome").show();
        if (localStorage.getItem('authToken')) {
            // We have logged in user
            $('#loggedInUser').text(", " + localStorage.getItem('username'));

            $("#linkLogin").hide();
            $("#linkRegister").hide();
            $("#linkListPlayers").show();
            $("#linkLogout").show();
        } else {
            // No logged in user
            $("#linkLogin").show();
            $("#linkRegister").show();
            $("#linkListPlayers").hide();
            $("#linkLogout").hide();
        }
    }

    function showView(viewName) {
        // Hide all views and show the selected view only
        $('main > section').hide();
        $('#' + viewName).show();
    }

    function showHomeView() {
        showView('viewHome');
    }

    function showLoginView() {
        showView('viewLogin');
        $('#formLogin').trigger('reset');
    }

    function showRegisterView() {
        $('#formRegister').trigger('reset');
        showView('viewRegister');
    }

    let date = '';

    function loginUser() {
        let userData = {
            username: $("#formLogin input[name=username]").val(),
            password: $("#formLogin input[name=passwd]").val()
        };

        $.ajax({
            method: "POST",
            url: kinveyBaseUrl + "user/" + kinveyAppKey + "/login",
            headers: kinveyAppAuthHeaders,
            data: userData,
            success: loginSuccess,
            error: handleAjaxError
        });
        function loginSuccess(userInfo) {
            saveAuthInSession(userInfo);
            showHideMenuLinks();
            listPlayers();
            noty({text: "Успешно влизане.", type: "success"});
        }
    }

    function registerUser() {
        let userData = {
            username: $("#formRegister input[name=username]").val(),
            password: $("#formRegister input[name=passwd]").val(),
            confirmPassword: $("#formRegister input[name=confirmPasswd]").val()
        };

        if (userData.password !== userData.confirmPassword) {
            noty({text: "Потвърдената парола не съвпада", type: "error"});

            showView("viewRegister");
            return false;
        }

        $.ajax({
            method: "POST",
            url: kinveyBaseUrl + "user/" + kinveyAppKey + "/",
            headers: kinveyAppAuthHeaders,
            data: userData,
            success: registerSuccess,
            error: handleAjaxError
        });
        function registerSuccess(userInfo) {
            saveAuthInSession(userInfo);
            showHideMenuLinks();
            listPlayers();
            noty({text: "Успешна регистрация", type: "success"});
        }

        return false;
    }

    function saveAuthInSession(userInfo) {
        let userAuth = userInfo._kmd.authtoken;
        localStorage.setItem("authToken", userAuth);
        let userId = userInfo._id;
        localStorage.setItem("userId", userId);
        let username = userInfo.username;
        localStorage.setItem("username", username);
    }

    function handleAjaxError(response) {
        let errorMsg = JSON.stringify(response);
        if (response.readyState === 0)
            errorMsg = "Cannot connect due to network error.";
        if (response.responseJSON &&
            response.responseJSON.description)
            errorMsg = response.responseJSON.description;
        noty({text: errorMsg, type: "error"});
    }

    function logoutUser() {
        localStorage.clear();
        $("#loggedInUser").text("");
        showHideMenuLinks();
        showView("viewHome");
        noty({text: "Успешно излизане.", type: "success"});
    }

    function listPlayers() {
        $("#players").empty();
        showView("viewPlayers");
        let dt = new Date();
        let year = dt.getFullYear();
        let month = Number(dt.getMonth() + 1);
        let day = dt.getDate();

        let dayOfWeekNumber = dt.getDay();
        let dayOfWeekString = "";
        switch (dayOfWeekNumber) {
            case 1: dayOfWeekString = "Понеделник"; break;
            case 2: dayOfWeekString = "Вторник"; break;
            case 3: dayOfWeekString = "Сряда"; break;
            case 4: dayOfWeekString = "Четвъртък"; break;
            case 5: dayOfWeekString = "Петък"; break;
            case 6: dayOfWeekString = "Събота"; break;
            case 7: dayOfWeekString = "Неделя"; break;
        }

        date = day + "-" + month  + "-" + year;
        $("#dateTime").text(dayOfWeekString + " " + date);

        getMatch();
        loadMessages();

        function getMatch() {
            let query = `?query={"date":"${date}"}`;
            $.ajax({
                method: "GET",
                url: kinveyBaseUrl + "appdata/" + kinveyAppKey + "/matches/" + query,
                headers: getKinveyUserAuthHeaders(),
                success: getMatchSuccess,
                error: handleAjaxError
            });
            function getMatchSuccess(match) {
                if (match.length === 0) {
                    createMatch(date);
                } else {
                    getPlayers(match[0]._id);
                }
            }
        }

        function createMatch(date) {
            let matchData = {
                "date": date
            };
            $.ajax({
                method: "POST",
                url: kinveyBaseUrl + "appdata/" + kinveyAppKey + "/matches",
                headers: getKinveyUserAuthHeaders(),
                data: matchData,
                success: createMatchSuccess,
                error: handleAjaxError
            });
            function createMatchSuccess() {
                listPlayers();
            }
        }

        function getPlayers(matchId) {
            let query = `?query={"match_id":"${matchId}"}`;

            $.ajax({
                method: "GET",
                url: kinveyBaseUrl + "appdata/" + kinveyAppKey + "/players/" + query,
                headers: getKinveyUserAuthHeaders(),
                success: loadPlayersSuccess,
                error: handleAjaxError
            });

            function loadPlayersSuccess(players) {
                $("#players").empty();
                let playersTable = $("<table>")
                    .append($("<tr>").append(
                        '<th>№</th><th id="tableName">Име</th><th class="buttonsTd">+/-</th>'));
                let counter = 1;
                for (let player of players) {
                    appendPlayerRow(player, playersTable, counter);
                    counter++;
                }

                let player = localStorage.getItem("username");
                let createPlayerRaw = $("<tr>").append(
                    $("<td>").text(counter),
                    $("<td><div><input type=\"text\" id=\"playerName\"></div></td>"),
                    $("<td class=\"buttonsTd\">").append($('<button type="button" class="btn btn-default btn-md mybtn-green"><span class="glyphicon glyphicon-plus-sign" aria-hidden="true"></span></button>')
                        .click(createPlayer.bind(this, matchId)))
                );
                $("#playerName").val(player);

                playersTable.append(createPlayerRaw);
                $("#players").append(playersTable);

                $(document).ready(function(){
                    $("#playerName").attr("value", player);
                });
            }

            function appendPlayerRow(player, playersTable, counter) {
                playersTable.append($("<tr>").append(
                    $("<td>").text(counter),
                    $("<td>").html(`<a href='#'>${player.name}</a>`).click(showPlayer.bind(this, player)),
                    $("<td class=\"buttonsTd\">").append($('<button type="button" class="btn btn-default btn-md mybtn-red"><span class="glyphicon glyphicon-minus-sign" aria-hidden="true"></button>')
                        .click(removePlayer.bind(this, player)))
                ));
            }
        }
    }

    // TODO: 
    function showPlayer(player) {
        $("main > section").hide();
        $("#viewPlayerInfo").empty();
        $("#viewPlayerInfo").show();
        $("#viewPlayerInfo").append(`<div><h3>${player.name}`);
    }

    function getKinveyUserAuthHeaders() {
        return {
            'Authorization': `Kinvey ${localStorage.getItem("authToken")}`
        };
    }
    
    function createPlayer(matchId) {
        let playerData = {"name": $("#playerName").val(), "match_id":matchId};

        $.ajax({
            method: "POST",
            url: kinveyBaseUrl + "appdata/" + kinveyAppKey + "/players",
            headers: getKinveyUserAuthHeaders(),
            data: playerData,
            success: createPlayerSuccess,
            error: handleAjaxError
        });

        function createPlayerSuccess() {
            listPlayers();
            noty({text: "Създаден е нов играч", type: "information"});
        }
    }

    function removePlayer(player) {
        $.ajax({
            method: "DELETE",
            url: kinveyBaseUrl + "appdata/" + kinveyAppKey + "/players/" + player._id,
            headers: getKinveyUserAuthHeaders(),
            success: removePlayerSuccess,
            error: handleAjaxError
        });
        function removePlayerSuccess() {
            listPlayers();
            noty({text: "Премахнат е играч", type: "information"});
        }
    }

    $(document).ready(function () {
        $('input[name="submitMessage"]').on("click", function (e) {
            e.preventDefault();

            let data = $(this).closest("form");
            let serialized = `${data.serialize()}&username=${localStorage.getItem("username")}&match_id=${date}`;

            $.ajax({
                method: "POST",
                url: kinveyBaseUrl + "appdata/" + kinveyAppKey + "/messages",
                headers: getKinveyUserAuthHeaders(),
                data: serialized,
                success: createMessageSuccess,
                error: handleAjaxError
            });
            function createMessageSuccess() {
                $("#formMessages input[name=message]").val("");
                loadMessages();
                noty({text: "Добавено е събощение", type: "information"});
            }
        });
    });

    function loadMessages() {
        $("#messagesContainer").empty();
        let query = `?query={"match_id":"${date}"}`;
        $.ajax({
            method: "GET",
            url: kinveyBaseUrl + "appdata/" + kinveyAppKey + "/messages/" + query,
            headers: getKinveyUserAuthHeaders(),
            success: loadMessagesSuccess,
            error: handleAjaxError
        });

        function loadMessagesSuccess(messages) {
            let messageContainer = $("#messagesContainer");

            for (let m of messages) {
                appendMessageRaw(m, messageContainer);
            }
        }

        function appendMessageRaw(m, messageContainer) {
            let pMessage = $("<p class=\"messages\">");
            let spanUsername = $("<span class=\"boldUsername\">").text(m.username + ": ");
            let spanMessage = $("<span>").text(m.message);
            pMessage.append(spanUsername);
            pMessage.append(spanMessage);
            messageContainer.append(pMessage);
        }
    }
}
