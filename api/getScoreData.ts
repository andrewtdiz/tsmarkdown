async function getScoreData() {
  await new Promise((res) => setTimeout(res, 1000))
  return 79
}

export { getScoreData }