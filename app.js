const firebaseState = new Firebase('https://durak-19d6b.firebaseio.com/state');
const suitNames = ['spades', 'hearts', 'clubs', 'diamonds'];
const playerElements = [
    document.querySelector('#player1 > .cards-container'),
    document.querySelector('#player2 > .cards-container')
];
const deckElement = document.querySelector('#deck');
const turnCardsElement = document.querySelector('#turn_cards > .cards-container');
const statusbarTextElement = document.querySelector('#statustext');
let myId = localStorage.getItem('id');
let myNickname = localStorage.getItem('nickname');

let state = {
    players: [],
    deck: [],
    trump: null,
    playerCards: [],
    turnCards: [],
    currentPlayer: null,
    isAttacking: false,
    winner: null
};

const saveState = function() {
    console.log("Saving state", state);
    firebaseState.set({state: state});
};

const onStateUpdate = function() {
    state.players = state.players || [];

    if (state.players.length == 2
        && !state.currentPlayer
        && 0 === getIndexById(state.players, myId)) {
        resetState();
        shuffleDeck();
        deal();
        setBeginnerIndex();
        update();
        saveState();
    }
    update();
};

const getIndexById = function(array, id) {
    for (let i = 0; i < array.length; i++) {
        if (array[i].id === id) {
            return i;
        }
    }
    return -1;
};

const resetState = function() {
    state.deck = [];
    for (let i = 0; i <= 3; i++) {
        for (let j = 6; j <= 14; j++) {
            state.deck.push({
                suit: i,
                rank: j
            });
        }
    }
    state.trump = null;
    state.playerCards = [];
    state.winner = null;
    state.currentPlayer = null;
    state.turnCards = [];
};

const resetGame = function() {
    resetState();
    state.deck = [];
    state.players = [];
    saveState();
};

const shuffleDeck = function() {
    for (let i = 0; i < 100; i++) {
        const idx = Math.round(Math.random() * 35);
        const cards = state.deck.splice(idx, 1);
        state.deck.push(cards[0]);
    }
};

const deal = function() {
    state.playerCards = state.playerCards || [];
    for (let i = 0; i < state.players.length; i++) {
        state.playerCards.push(state.deck.splice(state.deck.length - 6, 6));
    }
    state.trump = state.deck.pop();
    console.log(state);
};

const getSmallestRankOfSuit = function(cards, suit) {
    let smallestRank = 0;
    for (let i = 0; i < cards.length; i++) {
        if (cards[i].suit == suit && (smallestRank == 0 || cards[i].rank < smallestRank)) {
            smallestRank = cards[i].rank;
        }
    }
    return smallestRank;
};

const setBeginnerIndex = function() {
    let beginnerIndex = 0;
    let smallestTrumpRank = 0;

    for (let i = 0; i < state.players.length; i++) {
        const playerSmallestTrumpRank = getSmallestRankOfSuit(state.playerCards[i], state.trump.suit);
        if (smallestTrumpRank == 0 || playerSmallestTrumpRank !== 0 && playerSmallestTrumpRank < smallestTrumpRank) {
            smallestTrumpRank = playerSmallestTrumpRank;
            beginnerIndex = i;
        }
    }

    state.currentPlayer = state.players[beginnerIndex];
    state.isAttacking = true;
};

const takeInsufficientCardsFromDeck = function(idx) {
    if (state.playerCards[idx].length < 6 && state.deck && state.deck.length) {
        state.playerCards[idx] = state.playerCards[idx].concat(
            state.deck.splice(state.deck.length - 6 + state.playerCards[idx].length, 6 - state.playerCards[idx].length));
    }

    if (state.playerCards[idx].length < 6 && !state.trump.isTaken) {
        state.playerCards[idx].push(state.trump);
        state.trump.isTaken = true;
    }
};

const onCardClicked = function(idx) {
    console.log("card clicked", idx);
    let isValidMove = false;
    const myIndex = getIndexById(state.players, myId);
    if (!state.currentPlayer || state.currentPlayer.id !== myId) {
        return;
    }

    const clickedCard = state.playerCards[myIndex][idx];
    if (state.isAttacking) {
        if (!state.turnCards || state.turnCards.length === 0) {
            isValidMove = true;
        } else {
            for (let i = 0; i < state.turnCards.length; i++) {
                if (state.turnCards[i].rank === clickedCard.rank) {
                    isValidMove = true;
                    break;
                }
            }
        }
    } else {
        const attackCard = state.turnCards[state.turnCards.length - 1];
        isValidMove = clickedCard.suit === attackCard.suit && clickedCard.rank > attackCard.rank
                || clickedCard.suit === state.trump.suit;
    }

    if (isValidMove) {
        const cardsArr = state.playerCards[myIndex].splice(idx, 1); // switch player
        state.turnCards = state.turnCards || [];
        state.turnCards.push(cardsArr[0]);
        state.currentPlayer = state.players[(myIndex + 1) % 2];
        state.isAttacking = !state.isAttacking;

        if (state.playerCards[myIndex].length === 0) {
            if (state.playerCards[(myIndex + 1) % 2].length === 0) {
                state.winner = -1; // drawn
            } else {
                state.winner = state.players[myIndex];
            }
        } else if(state.playerCards[(myIndex + 1) % 2].length === 0) {
            state.winner = state.players[(myIndex + 1) % 2];
        }

        state.currentPlayer = state.winner ? null : state.currentPlayer;
        saveState();
    }
};

const finishTurn = function() {
    const myIndex = getIndexById(state.players, myId);
    if (!state.currentPlayer || state.currentPlayer.id !== myId || !state.isAttacking) {
        return;
    }
    state.turnCards = [];
    takeInsufficientCardsFromDeck(myIndex);
    takeInsufficientCardsFromDeck((myIndex + 1) % 2);
    state.currentPlayer = state.players[(myIndex + 1) % 2];  // switch player
    state.isAttacking = true;
    saveState();
};

const takeCards = function() {
    const myIndex = getIndexById(state.players, myId);
    if (!state.currentPlayer || state.currentPlayer.id !== myId || state.isAttacking) {
        return;
    }

    state.playerCards[myIndex] = state.playerCards[myIndex].concat(state.turnCards);
    state.turnCards = [];
    state.currentPlayer = state.players[(myIndex + 1) % 2];  // switch player
    takeInsufficientCardsFromDeck((myIndex + 1) % 2);
    state.isAttacking = true;
    saveState();
};

const createPlayerCardsElements = function(idx) {
    if (!state.playerCards || !state.playerCards[idx] || state.playerCards[idx].length === 0) {
        return;
    }
    const cards = state.playerCards[idx];
    let cardEl;
    for (let i = 0; i < cards.length; i++) {
        if (state.players[idx].id === myId) {
            cardEl = createCardElement(cards[i]);
            cardEl.onclick = function() {
                onCardClicked(i);
            }
        } else {
            cardEl = createCardElement({})
        }
        cardEl.setAttribute('style', 'left: ' + (i * 100 / cards.length) + '%;');
        playerElements[idx].appendChild(cardEl);
    }
};

const createDeckElements = function() {
    if (state.deck && state.deck.length !== 0) {
        deckElement.appendChild(createCardElement({}));
    }
    if (!state.trump || state.trump.isTaken) {
        return;
    }
    const trumpEl = createCardElement(state.trump);
    trumpEl.classList.add('rotated');
    trumpEl.style.zIndex = -10;
    deckElement.appendChild(trumpEl);
};

const createTurnCardsElements = function() {
    const cards = state.turnCards;
    if (!cards) {
        return;
    }
    for (let i = 0; i < cards.length / 2; i++) {
        const card = cards[i * 2];
        const cardEl = createCardElement(card);
        cardEl.setAttribute('style', 'left: ' + (i * 100 / cards.length) + '%;');
        turnCardsElement.appendChild(cardEl);

        const card2 = cards[i * 2 + 1];
        if (card2) {
            const cardEl2 = createCardElement(card2);
            cardEl2.setAttribute('style', 'left: ' + (2 + i * 100 / cards.length) + '%;');
            turnCardsElement.appendChild(cardEl2);
        }
    }
};

const createCardElement = function(card) {
    const cardEl = document.createElement('div');
    const inner = document.createElement('div');
    cardEl.classList.add('card');

    if (card.suit !== undefined && card.rank !== undefined) {
        cardEl.classList.add(suitNames[card.suit]);
        cardEl.classList.add('rank' + (card.rank == 14 ? 1 : card.rank));
        inner.classList.add('face');
    } else {
        inner.classList.add('back');
    }

    cardEl.appendChild(inner);

    return cardEl;
};

const removeAllCardElements = function() {
    const cardElements = document.querySelectorAll('.card');
    for (let i = 0; i < cardElements.length; i++) {
        cardElements[i].parentNode.removeChild(cardElements[i]);
    }
};

const setStatus = function() {
    const myIndex = getIndexById(state.players, myId);
    if (myIndex === -1 && state.players.length < 2) {
        statusbarTextElement.innerText  = myNickname + '! Click join the game to play.';
        return;
    }
    if (myIndex === 0 && state.players.length === 1) {
        statusbarTextElement.innerText  = 'Waiting for a player ...';
        return;
    }

    if (!state.currentPlayer) {
        statusbarTextElement.innerText  = 'Game finished';
        if (state.winner) {
            statusbarTextElement.innerText += state.winner === -1 ? ' with drawn' : '. ' + state.winner.nickname + ' won.';
        }
    } else if (state.currentPlayer.id === myId) {
        statusbarTextElement.innerText =  myNickname + '! Your turn!';
    } else {
        statusbarTextElement.innerText = 'Waiting for opponent action ...';
    }
};

const update = function() {
    removeAllCardElements();
    for (let i = 0; i < state.players.length; i++) {
        createPlayerCardsElements(i);
    }
    createDeckElements();
    createTurnCardsElements();
    setStatus();
    document.getElementById('join_game').style.visibility =
        getIndexById(state.players, myId) === -1 && state.players.length < 2 ? 'visible' : 'hidden';
    document.getElementById('finish_turn').style.visibility =
        state.currentPlayer && state.currentPlayer.id === myId && state.isAttacking
            && state.turnCards && state.turnCards.length > 0 ? 'visible' : 'hidden';
    document.getElementById('take_cards').style.visibility =
        state.currentPlayer && state.currentPlayer.id === myId && !state.isAttacking
        && state.turnCards && state.turnCards.length > 0 ? 'visible' : 'hidden';
};

const joinToGame = function() {
    state.players.push({id: myId, nickname: myNickname});
    saveState();
};

const onFirebaseStateUpdate = function(snapshot) {
    state = snapshot.val();
    onStateUpdate();
};

const init = function() {
    if (!myId) {
        myId = Math.round(Math.random() * 100000000);
        localStorage.setItem('id', myId);
    }
    myId = +myId;

    while (!myNickname) {
        myNickname = prompt('Please enter your nickname', '');
    }

    localStorage.setItem('nickname', myNickname);
    firebaseState.on('child_added', onFirebaseStateUpdate);
    firebaseState.on('child_changed', onFirebaseStateUpdate);

    setStatus();
};
init();