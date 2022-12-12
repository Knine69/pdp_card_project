import { useState } from 'react';
import DeckOfCardsAPI from '../services/deckofcardsapi';
import GameContext from './GameContext';

const GameProvider = ({ children }) => {
	const [idGame, setIdGame] = useState(null);
	const [win, setWin] = useState(false);
	const [showToast, setShowToast] = useState(false);
	const [winName, setWinName] = useState('');
	const ruleOutCardsPlayerOne = [];
	const ruleOutCardsPlayerTwo = [];
	const cardValues = {
		JACK: 11,
		QUEEN: 12,
		KING: 13,
		ACE: 14,
	};
	const nanValues = {
		JACK: 'JACK',
		QUEEN: 'QUEEN',
		KING: 'KING',
		ACE: 'ACE',
	};

	const [playerOne, setPlayerOne] = useState({
		name: '',
		cards: [{}],
		fourths: [],
		trios: [],
		pairs: [],
	});
	const [playerTwo, setPlayerTwo] = useState({
		name: '',
		cards: [{}],
		fourths: [],
		trios: [],
		pairs: [],
	});
	const [rerender, setRerender] = useState(false);

	const playGame = async () => {
		setIdGame(await DeckOfCardsAPI.getIdGame());
	};

	const updateCardsWholeDeck = cards => {
		const cardsOne = playerOne;
		cardsOne.cards = cards.slice(0, 10);
		const cardsTwo = playerTwo;
		cardsTwo.cards = cards.slice(10, 21);

		setPlayerOne(cardsOne);
		setPlayerTwo(cardsTwo);
	};

	const requestCards = async () => {
		if (playerOne.cards.length === 1 && playerTwo.cards.length === 1) {
			const cards = await DeckOfCardsAPI.getCardsStack(idGame);
			updateCardsWholeDeck(cards);
		} else if (playerOne.cards.length > 1 && playerTwo.cards.length > 1) {
			const pairCards = await DeckOfCardsAPI.getCardsPair(idGame);

			if (pairCards.length === 0) {
				alert('Game over, nobody won');
				window.location = '/';
			}
			checkStairCase(pairCards);

			if (ruleOutCardsPlayerOne.length > 0) {
				swapCard(ruleOutCardsPlayerOne[0], pairCards[0], true);
				ruleOutCardsPlayerOne.length = 0;
			} else {
				const cardWithNoBounds = returnCardWithNoBonds(playerOne.cards, true);

				if (cardWithNoBounds) {
					swapCard(cardWithNoBounds, pairCards[0], true);
				} else {
					checkWinCondition(pairCards[0], true);
				}
			}
			if (ruleOutCardsPlayerTwo.length > 0) {
				swapCard(ruleOutCardsPlayerTwo[0], pairCards[1], false);
				ruleOutCardsPlayerTwo.length = 0;
			} else {
				const cardWithNoBounds = returnCardWithNoBonds(playerTwo.cards, false);

				if (cardWithNoBounds) {
					swapCard(cardWithNoBounds, pairCards[1], false);
				} else {
					checkWinCondition(pairCards[1], false);
				}
			}
		}
		checkTrioOrFourth();

		setRerender(!rerender);
		if (playerOne.fourths.length === 1 && playerOne.trios.length === 2) {
			setWin(true);
			setWinName(playerOne.name);
			alert('Player one won');
			window.location = '/';
		}
		if (playerTwo.fourths.length === 1 && playerTwo.trios.length === 2) {
			setWin(true);
			setWinName(playerTwo.name);
			alert('Player two won');
			window.location = '/';
		}
	};

	const checkStairCase = pairCards => {
		const oneSuites = [];
		const twoSuites = [];
		for (let i = 0; i < 10; i++) {
			const oneColors = [
				playerOne.cards.filter(item => item.suit === playerOne.cards[i].suit),
			];
			const twoColors = [
				playerTwo.cards.filter(item => item.suit === playerTwo.cards[i].suit),
			];

			if (!oneSuites.includes(oneColors[0][0].suit)) {
				if (oneColors[0].length >= 3) {
					validateStairCase(oneColors, true, pairCards[0]);
				} else {
					const firstCard = validateSwitchCards(
						oneColors,
						oneColors[0][0].value,
						true
					);

					let secondCard = null;

					if (oneColors[0].length === 2) {
						secondCard = validateSwitchCards(
							oneColors,
							oneColors[0][1].value,
							true
						);
					}

					if (firstCard) {
						ruleOutCardsPlayerOne.push(firstCard);
					} else if (secondCard) {
						ruleOutCardsPlayerOne.push(secondCard);
					}
				}
				oneSuites.push(oneColors[0][0].suit);
			}
			if (!twoSuites.includes(twoColors[0][0].suit)) {
				if (twoColors[0].length >= 3) {
					validateStairCase(twoColors, false, pairCards[1]);
				} else {
					const firstCard = validateSwitchCards(
						twoColors,
						twoColors[0][0].value,
						false
					);
					let secondCard = null;

					if (twoColors[0].length === 2) {
						secondCard = validateSwitchCards(
							twoColors,
							twoColors[0][1].value,
							false
						);
					}

					if (firstCard) {
						ruleOutCardsPlayerTwo.push(firstCard);
					} else if (secondCard) {
						ruleOutCardsPlayerTwo.push(secondCard);
					}
				}
				twoSuites.push(twoColors[0][0].suit);
			}
		}
	};

	const validateStairCase = (suitesArray, one, cardDrew) => {
		if (cardDrew.suit === suitesArray[0].suit) {
			suitesArray.push(cardDrew);
		}

		const replaceCard = organizeDeckOrderly(suitesArray, one);

		if (replaceCard) {
			if (one) {
				ruleOutCardsPlayerOne.push(replaceCard);
			} else {
				ruleOutCardsPlayerTwo.push(replaceCard);
			}
		}
	};

	const swapCard = (oldCard, newCard, one) => {
		const deck = one ? playerOne : playerTwo;

		deck.cards = deck.cards.filter(item => item.code !== oldCard.code);
		deck.cards.push(newCard);
		if (one) {
			setPlayerOne(deck);
		} else {
			setPlayerTwo(deck);
		}
	};

	const organizeDeckOrderly = (deck, one) => {
		const auxArray = [];
		const length = deck[0].length;
		let countDownwards = 0;
		let countUpwards = 0;

		for (let i = 0; i < length; i++) {
			if (isNaN(deck[0][i].value)) {
				auxArray.push(caseNanCardValues(deck[0][i].value));
			} else {
				auxArray.push(parseInt(deck[0][i].value));
			}
		}
		auxArray.sort((a, b) => a - b);

		if (
			auxArray[length - 1] === 14 &&
			auxArray[0] === 2 &&
			auxArray[1] === 12
		) {
			countDownwards++;
		}

		for (let i = 0; i < length - 1; i++) {
			if (auxArray[i] - auxArray[i + 1] === -1) {
				countUpwards++;
			} else {
				break;
			}
		}

		for (let i = length - 1; i > 1; i--) {
			if (auxArray[i] - auxArray[i - 1] === 1) {
				countDownwards++;
			} else {
				break;
			}
		}

		if (countDownwards > countUpwards) {
			switch (countDownwards) {
				case 3:
					return checkValidityOfStairCase(
						length,
						3,
						one,
						true,
						deck,
						auxArray,
						countDownwards
					);
				case 4:
					return checkValidityOfStairCase(
						length,
						4,
						one,
						true,
						deck,
						auxArray,
						countDownwards
					);

				default:
					if (countDownwards < 3 || countDownwards > 4) {
						return returnDynamicObject(deck, auxArray, 0, one);
					}
					break;
			}
		} else if (countUpwards > countDownwards) {
			switch (countUpwards) {
				case 3:
					return checkValidityOfStairCase(
						length,
						3,
						one,
						false,
						deck,
						auxArray,
						countUpwards
					);
				case 4:
					return checkValidityOfStairCase(
						length,
						4,
						one,
						false,
						deck,
						auxArray,
						countUpwards
					);
				default:
					if (countUpwards < 3 || countUpwards > 4) {
						return returnDynamicObject(
							deck,
							auxArray,
							Math.round(length / 2),
							one
						);
					}
					break;
			}
		} else if (countDownwards === countUpwards) {
			switch (countUpwards) {
				case 3:
					return checkValidityOfStairCase(
						length,
						3,
						one,
						false,
						deck,
						auxArray,
						countUpwards
					);
				case 4:
					return checkValidityOfStairCase(
						length,
						4,
						one,
						false,
						deck,
						auxArray,
						countUpwards
					);
				default:
					if (countUpwards < 3 || countUpwards > 4) {
						return returnDynamicObject(
							deck,
							auxArray,
							Math.round(length / 2),
							one
						);
					}
					break;
			}
		}
	};

	const returnCardWithNoBonds = (deck, one) => {
		let cardToReturn = null;
		for (const card of deck) {
			if (
				!pairAlreadyAdded(card, one) &&
				!trioAlreadyAdded(card, one) &&
				!fourthAlreadyAdded(card, one)
			) {
				cardToReturn = card;
				break;
			}
		}

		return cardToReturn;
	};

	const checkWinCondition = (newCard, one) => {
		const player = one ? playerOne : playerTwo;
		if (player.trios.length < 2) {
			if (pairAlreadyAdded(newCard, one)) {
				const newTrioToAdd = player.cards.filter(
					item => item.value === newCard.value
				);
				newTrioToAdd.push(newCard);
				swapFromPairWinCondition(newCard, one);
				addToTrioProcess(newTrioToAdd, one);
			}
		}

		if (player.fourths.length < 1) {
			if (trioAlreadyAdded(newCard, one)) {
				const newFourthToAdd = player.cards.filter(
					item => item.value === newCard.value
				);
				newFourthToAdd.push(newCard);
				swapFromTrioWinCondition(newCard, one);
				addToFourthProcess(newFourthToAdd, one);
			}
		}
	};

	const swapFromPairWinCondition = (card, one) => {
		const player = one ? playerOne : playerTwo;
		let pairs = player.pairs.filter(pair => pair[0].value !== card.value);
		const randomCardToSwap = pairs[0][0];

		pairs = pairs.filter(pair => pair[0].value !== randomCardToSwap.value);
		player.pairs = pairs;
		swapCard(randomCardToSwap, card, one);

		if (one) {
			setPlayerOne(player);
		} else {
			setPlayerTwo(player);
		}
	};

	const swapFromTrioWinCondition = (card, one) => {
		const player = one ? playerOne : playerTwo;
		const trios = player.trios.filter(trio => trio[0].value !== card.value);
		const pairs = player.pairs.filter(
			pair => pair[0].value !== player.pairs[0][0]
		);
		player.trios = trios;
		player.pairs = pairs;
		swapCard(player.pairs[0][0], card, one);

		if (one) {
			setPlayerOne(player);
		} else {
			setPlayerTwo(player);
		}
	};

	const checkValidityOfStairCase = (
		length,
		checkLength,
		one,
		down,
		deck,
		auxArray,
		counter
	) => {
		const newArray =
			length === counter ? auxArray : auxArray.slice(0, checkLength);
		const newDeckArray = returnCardsFromDeck(newArray, deck);
		if (length > checkLength && checkSuites(newDeckArray, one)) {
			if (checkLength === 4) {
				addToFourthProcess(newDeckArray, one);
			} else {
				addToTrioProcess(returnCardsFromDeck(newDeckArray, deck), one);
			}

			if (down) {
				return returnDynamicObject(deck, auxArray, 0, one);
			}
			return returnDynamicObject(deck, auxArray, length - 1, one);
		} else if (length === checkLength && checkSuites(newDeckArray, one)) {
			if (checkLength === 4) {
				addToFourthProcess(returnCardsFromDeck(newDeckArray, deck), one);
			} else {
				addToTrioProcess(returnCardsFromDeck(newDeckArray, deck), one);
			}

			return null;
		}
	};

	const returnCardsFromDeck = (newArray, deck) => {
		const deckStairCase = [];

		for (const cardArray of newArray) {
			for (const cardDeck of deck) {
				if (!deckStairCase.includes(cardDeck)) {
					if (cardArray.value === cardDeck.value) {
						deckStairCase.push(cardDeck);
					}
				}
			}
		}

		return deckStairCase;
	};

	const checkSuites = (newArray, one) => {
		if (
			!trioAlreadyAdded(newArray, one) &&
			!pairAlreadyAdded(newArray, one) &&
			!fourthAlreadyAdded(newArray, one)
		) {
			return true;
		}
		return false;
	};

	const returnDynamicObject = (deck, auxArray, index, one) => {
		let value = auxArray[index];

		if (value > 10) {
			value = caseIntToNan(value);
		}

		return validateSwitchCards(deck, value, one);
	};

	const validateSwitchCards = (deck, value, one) => {
		let cardToSwitch = null;
		for (const card of deck[0]) {
			if (
				card.value === value.toString() &&
				!pairAlreadyAdded(card, one) &&
				!trioAlreadyAdded(card, one) &&
				!fourthAlreadyAdded(card, one)
			) {
				cardToSwitch = card;
			}
		}

		return cardToSwitch;
	};

	const caseNanCardValues = cardValue => {
		switch (cardValue) {
			case 'JACK':
				return cardValues.JACK;
			case 'QUEEN':
				return cardValues.QUEEN;
			case 'KING':
				return cardValues.KING;
			case 'ACE':
				return cardValues.ACE;
		}
	};

	const caseIntToNan = cardValue => {
		switch (cardValue) {
			case 11:
				return nanValues.JACK;
			case 12:
				return nanValues.QUEEN;
			case 13:
				return nanValues.KING;
			case 14:
				return nanValues.ACE;
		}
	};

	const checkTrioOrFourth = () => {
		const oneValues = [];
		const twoValues = [];
		for (let i = 0; i < 10; i++) {
			const oneFilter = [
				playerOne.cards.filter(item => item.value === playerOne.cards[i].value),
			];
			const twoFilter = [
				playerTwo.cards.filter(item => item.value === playerTwo.cards[i].value),
			];

			if (!oneValues.includes(oneFilter[0][0].value)) {
				const repeatedOne = oneFilter[0].length;
				if (repeatedOne === 3) {
					addToTriosOne(oneFilter, i);
				} else if (repeatedOne === 2) {
					addToPairsOne(oneFilter, i);
				} else if (repeatedOne === 4) {
					addToFourthOne(oneFilter, i);
				}
				oneValues.push(oneFilter[0][0].value);
			}

			if (!twoValues.includes(twoFilter[0][0].value)) {
				const repeatedTwo = twoFilter[0].length;
				if (repeatedTwo === 3) {
					addToTriosTwo(twoFilter, i);
				} else if (repeatedTwo === 2) {
					addToPairsTwo(twoFilter, i);
				} else if (repeatedTwo === 4) {
					addToFourthTwo(twoFilter, i);
				}
				twoValues.push(twoFilter[0][0].value);
			}
		}
	};

	const addToFourthOne = (oneFilter, i) => {
		if (
			checkFourDifferentColors(oneFilter[0]) &&
			!fourthAlreadyAdded(playerOne.cards[i], true)
		) {
			if (trioAlreadyAdded(playerOne.cards[i], true)) {
				swapFromTrio(playerOne.cards[i], true);
			}
			addToFourthProcess(oneFilter[0], true);
		}
	};

	const addToFourthTwo = (twoFilter, i) => {
		if (
			checkFourDifferentColors(twoFilter[0]) &&
			!fourthAlreadyAdded(playerTwo.cards[i], false)
		) {
			if (trioAlreadyAdded(playerTwo.cards[i], false)) {
				swapFromTrio(playerTwo.cards[i], false);
			}
			addToFourthProcess(twoFilter[0], false);
		}
	};

	const addToFourthProcess = (array, one) => {
		const auxPlayer = one ? playerOne : playerTwo;
		auxPlayer.fourths = [...auxPlayer.fourths, Array.from(new Set(array))];
		if (one) {
			setPlayerOne(auxPlayer);
		} else {
			setPlayerTwo(auxPlayer);
		}
	};

	const addToTrioProcess = (array, one) => {
		const auxPlayer = one ? playerOne : playerTwo;
		auxPlayer.trios = [...auxPlayer.trios, Array.from(new Set(array))];
		if (one) {
			setPlayerOne(auxPlayer);
		} else {
			setPlayerTwo(auxPlayer);
		}
	};

	const addToTriosOne = (oneFilter, i) => {
		if (
			checkThreeDifferentColors(oneFilter[0]) &&
			!trioAlreadyAdded(playerOne.cards[i], true)
		) {
			if (pairAlreadyAdded(playerOne.cards[i], true)) {
				swapFromPair(playerOne.cards[i], true);
			}
			addToTrioProcess(oneFilter[0], true);
		}
	};

	const addToTriosTwo = (twoFilter, i) => {
		if (
			checkThreeDifferentColors(twoFilter[0]) &&
			!trioAlreadyAdded(playerTwo.cards[i], false)
		) {
			if (pairAlreadyAdded(playerTwo.cards[i], false)) {
				swapFromPair(playerTwo.cards[i], false);
			}
			addToTrioProcess(twoFilter[0], false);
		}
	};

	const swapFromTrio = (card, one) => {
		const player = one ? playerOne : playerTwo;
		const trios = player.trios.filter(trio => trio[0].value !== card.value);
		player.trios = trios;

		if (one) {
			setPlayerOne(player);
		} else {
			setPlayerTwo(player);
		}
	};

	const swapFromPair = (card, one) => {
		const player = one ? playerOne : playerTwo;
		const pairs = player.pairs.filter(pair => pair[0].value !== card.value);
		player.pairs = pairs;

		if (one) {
			setPlayerOne(player);
		} else {
			setPlayerTwo(player);
		}
	};

	const addToPairsProcess = (array, one) => {
		const auxPlayer = one ? playerOne : playerTwo;
		auxPlayer.pairs = [...auxPlayer.pairs, Array.from(new Set(array))];
		if (one) {
			setPlayerOne(auxPlayer);
		} else {
			setPlayerTwo(auxPlayer);
		}
	};

	const addToPairsOne = (oneFilter, i) => {
		if (
			checkTwoDifferentColors(oneFilter[0]) &&
			!pairAlreadyAdded(playerOne.cards[i], true)
		) {
			addToPairsProcess(oneFilter[0], true);
		}
	};

	const addToPairsTwo = (twoFilter, i) => {
		if (
			checkTwoDifferentColors(twoFilter[0]) &&
			!pairAlreadyAdded(playerTwo.cards[i], false)
		) {
			addToPairsProcess(twoFilter[0], false);
		}
	};

	const checkFourDifferentColors = array => {
		return checkDifferentColors(array) === 4;
	};

	const checkThreeDifferentColors = array => {
		return checkDifferentColors(array) === 3;
	};

	const checkTwoDifferentColors = array => {
		return checkDifferentColors(array) === 2;
	};

	const checkDifferentColors = array => {
		return new Set(array).size;
	};

	const fourthAlreadyAdded = (card, group) => {
		if (group) {
			return filterAlreadyAdded(playerOne.fourths, card);
		} else {
			return filterAlreadyAdded(playerTwo.fourths, card);
		}
	};

	const trioAlreadyAdded = (card, group) => {
		if (group) {
			return filterAlreadyAdded(playerOne.trios, card);
		} else {
			return filterAlreadyAdded(playerTwo.trios, card);
		}
	};

	const pairAlreadyAdded = (card, group) => {
		if (group) {
			return filterAlreadyAdded(playerOne.pairs, card);
		} else {
			return filterAlreadyAdded(playerTwo.pairs, card);
		}
	};

	const filterAlreadyAdded = (array, card) => {
		if (array.length > 0) {
			for (const item of array) {
				if (item[0].value === card.value) {
					return true;
				}
			}
		}
		return false;
	};

	return (
		<GameContext.Provider
			value={{
				playGame,
				requestCards,
				playerOne,
				setPlayerOne,
				playerTwo,
				setPlayerTwo,
				showToast,
				setShowToast,
				winName,
			}}
		>
			{children}
		</GameContext.Provider>
	);
};

export default GameProvider;
