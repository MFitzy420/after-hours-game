/**
 * Private card comparisons are about *meaning*, not just button positions.
 * 'Me' and 'You' are resolved from the perspective of the respondent.
 */
export function resolveChoice(card, optionIndex, playerIndex) {
  if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= (card.options?.length ?? 0)) {
    throw new RangeError('Invalid private-answer option');
  }
  if (playerIndex !== 0 && playerIndex !== 1) throw new RangeError('Invalid player index');
  const strategy = card.matchStrategy ?? 'same-option';
  if (strategy === 'relative-person') {
    // Option 0: "Me". Option 1: "You". Remaining choices (both/neither) are absolute.
    if (optionIndex === 0) return `person:${playerIndex}`;
    if (optionIndex === 1) return `person:${1 - playerIndex}`;
    return `shared:${optionIndex}`;
  }
  if (strategy === 'reciprocal-lead') {
    // Option 2: "Take the lead" (my partner leads).
    // Option 3: "Let me lead" (I lead).
    if (optionIndex === 2) return `lead:${1 - playerIndex}`;
    if (optionIndex === 3) return `lead:${playerIndex}`;
    return `action:${optionIndex}`;
  }
  if (strategy === 'mood-with-relative-lead') {
    // Option 2: "Let you take charge" means the *other* player leads.
    if (optionIndex === 2) return `lead:${1 - playerIndex}`;
    return `option:${optionIndex}`;
  }
  if (strategy === 'same-option') return `option:${optionIndex}`;
  throw new Error(`Unrecognised match strategy: ${strategy}`);
}

export function comparePrivateAnswers(card, first, second, playerNames = ['Person 1', 'Person 2']) {
  const firstKey = resolveChoice(card, first, 0);
  const secondKey = resolveChoice(card, second, 1);
  const match = firstKey === secondKey;
  const sharedPerson = match && /^(person|lead):[01]$/.test(firstKey)
    ? playerNames[Number(firstKey.split(':')[1])]
    : null;
  const a = card.options[first], b = card.options[second];
  const describeKey = key => {
    if (key.startsWith('person:')) return `Chosen: ${playerNames[Number(key.split(':')[1])]}`;
    if (key.startsWith('lead:')) return `${playerNames[Number(key.split(':')[1])]} leads`;
    return '';
  };
  const isGuess = card.privateMode === 'guess';
  let summary = '';
  if (isGuess) summary = match
    ? 'Spot on. You guessed what your partner really noticed.'
    : 'Not quite. Now you know what really caught their eye.';
  else if (match && sharedPerson) summary = `You both chose ${sharedPerson}.`;
  else if (match && first === second) summary = `You both chose “${a}”.`;
  else if (match) summary = 'Two different answers, the same intention.';
  else summary = 'Different answers. No challenge this round.';

  // There is NEVER a consolation dare. A win unlocks an action; a miss does not.
  const template = match ? (card.winActions?.[first] ?? card.matchAction) : null;
  const action = (template || (match ? 'You win! Enjoy a kiss together.' : 'No match, no challenge. Draw the next card.'))
    .replaceAll('{person}', sharedPerson ?? 'your chosen player')
    .replaceAll('{choice}', a);
  return {
    match, isGuess, firstKey, secondKey,
    firstMeaning: isGuess ? '' : describeKey(firstKey),
    secondMeaning: isGuess ? '' : describeKey(secondKey),
    firstLabel: isGuess ? `${playerNames[0]} guessed` : playerNames[0],
    secondLabel: isGuess ? `${playerNames[1]} answered` : playerNames[1],
    sharedPerson, summary, action, firstAnswer: a, secondAnswer: b,
  };
}
