async function getScoreData() {
  await new Promise((res) => setTimeout(res, 10))
  return ({
    data: {
      isAuthorized: true,
      active: true,
      name: "Bob",
      description: "Bob's description"
    },
    error: null,
    timedout: false
  })
}

export { getScoreData }