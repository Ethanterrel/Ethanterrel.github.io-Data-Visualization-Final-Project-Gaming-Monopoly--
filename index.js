async function drawLineChart() {

  const pathToJSON = './CompanyData.json'
  const dataset = await d3.json(pathToJSON)

  // Accessor Functions
  const sexAccessor = d => d.sex
  const sexes = ["female", "male"]
  const sexIds = d3.range(sexes.length)

  const educationAccessor = d => d.education

  // Hard-coded education names and order
  const educationNames = [
    "Other",
    "Sony",
    "THQ",
    "Indie",
    "Microsoft"
  ]
  const educationIds = d3.range(educationNames.length)

  const sesAccessor = d => d.ses
  const sesNames = ["middle"]
  const sesIds = d3.range(sesNames.length)

  const getStatusKey = ({ sex, ses }) => [sex, ses].join("--")

  // probabilities of being in each stack
  const stackedProbabilities = {}
  dataset.forEach(startingPoint => {
    const key = getStatusKey(startingPoint)
    let stackedProbability = 0
    stackedProbabilities[key] = educationNames.map((education, i) => {
      stackedProbability += (startingPoint[education] / 100)
      if (i == educationNames.length - 1) {
        // accounting for rounding error
        return 1
      } else {
        return stackedProbability
      }
    })
  })

  let currentPersonId = 0
  function generatePerson(elapsed) {
    currentPersonId++

    // Use our utility functions (bottom) to select a random value from our arrays
    const sex = getRandomValue(sexIds)
    const ses = getRandomValue(sesIds)
    const statusKey = getStatusKey({
      sex: sexes[sex],
      ses: sesNames[ses],
    })
    const probabilities = stackedProbabilities[statusKey]
    const education = d3.bisect(probabilities, Math.random())

    return {
      id: currentPersonId,
      sex,
      ses,
      education,
      startTime: elapsed + getRandomNumberInRange(-0.1, 0.1),
      yJitter: getRandomNumberInRange(-15, 15),
    }
  }

  // Create dimensions

  const width = d3.min([
    window.innerWidth * 0.9,
    1200
  ])
  let dimensions = {
    width: width,
    height: 500,
    margin: {
      top: 10,
      right: 200,
      bottom: 10,
      left: 120,
    },
    pathHeight: 50,
    endsBarWidth: 15,
    endingBarPadding: 3,
  }
  dimensions.boundedWidth = dimensions.width
    - dimensions.margin.left
    - dimensions.margin.right
  dimensions.boundedHeight = dimensions.height
    - dimensions.margin.top
    - dimensions.margin.bottom

  // Draw canvas

  const wrapper = d3.select("#wrapper")
    .append("svg")
    .attr("width", dimensions.width)
    .attr("height", dimensions.height)

  const bounds = wrapper.append("g")
    .style("transform", `translate(${
      dimensions.margin.left
      }px, ${
      dimensions.margin.top
      }px)`)

  // Create scales

  // We have three starting y positions and six ending y positions to draw paths for
  const xScale = d3.scaleLinear()
    .domain([0, 1])
    .range([0, dimensions.boundedWidth])  // 0 is waiting to start; 1 means the journey to the right is complete
    .clamp(true)  // clamping data so that we are not drawing outside our path

  const startYScale = d3.scaleLinear()
    .domain([sesIds.length, -1])
    .range([0, dimensions.boundedHeight])

  const endYScale = d3.scaleLinear()
    .domain([educationIds.length, -1])
    .range([0, dimensions.boundedHeight])

  const yTransitionProgressScale = d3.scaleLinear()
    .domain([0.45, 0.55]) // x transition progress
    .range([0, 1])        // y transition progress
    .clamp(true)

  const colorScale = d3.scaleLinear()
    .domain(d3.extent(sesIds))
    .range(["#FFA500", "#B53471"])
    .interpolate(d3.interpolateHcl)

  // Draw data
  const linkLineGenerator = d3.line()
    .x((d, i) => i * (dimensions.boundedWidth / 5))
    .y((d, i) => i <= 2
      ? startYScale(d[0])
      : endYScale(d[1])
    )
    .curve(d3.curveMonotoneX)
  const linkOptions = d3.merge(
    sesIds.map(startId => (
      educationIds.map(endId => (
        new Array(6).fill([startId, endId])
      ))
    ))
  )
  const linksGroup = bounds.append("g")
  const links = linksGroup.selectAll(".category-path")
    .data(linkOptions)
    .enter().append("path")
    .attr("class", "category-path")
    .attr("d", linkLineGenerator)
    .attr("stroke-width", dimensions.pathHeight)

  // Draw peripherals
  // create labels and translate to appropriate positions
  const startingLabelsGroup = bounds.append("g")
    .style("transform", "translateX(-20px)")

  const startingLabels = startingLabelsGroup.selectAll(".start-label")
    .data(sesIds)
    .enter().append("text")
    .attr("class", "label start-label")
    .attr("y", (d, i) => startYScale(i))
    .text((d, i) => sentenceCase(sesNames[i]))

  const startLabel = startingLabelsGroup.append("text")
    .attr("class", "start-title")
    .attr("y", startYScale(sesIds[sesIds.length - 1]) - 65)
    .text("Amount")
  const startLabelLineTwo = startingLabelsGroup.append("text")
    .attr("class", "start-title")
    .attr("y", startYScale(sesIds[sesIds.length - 1]) - 35)
    .text("Gained")

  const startingBars = startingLabelsGroup.selectAll(".start-bar")
    .data(sesIds)
    .enter().append("rect")
    .attr("x", 20)
    .attr("y", d => startYScale(d) - (dimensions.pathHeight / 2))
    .attr("width", dimensions.endsBarWidth)
    .attr("height", dimensions.pathHeight)
    .attr("fill", colorScale)

  const endingLabelsGroup = bounds.append("g")
    .style("transform", `translateX(${
      dimensions.boundedWidth + 20
      }px)`)

  const endingLabels = endingLabelsGroup.selectAll(".end-label")
    .data(educationNames)
    .enter().append("text")
    .attr("class", "label end-label")
    .attr("y", (d, i) => endYScale(i) - 20)
    .text(d => d)

  // Represent males on the chart using circles
  const maleMarkers = endingLabelsGroup.selectAll(".male-marker")
    .data(educationIds)
    .enter().append("circle")
    .attr("class", "ending-marker male-marker")
    .attr("r", 5.5)
    .attr("cx",  - 5)
    .attr("cy", d => endYScale(d) + 5)

  // Represent females on the chart using triangles
  const trianglePoints = [  // [0,0] is the starting point
    "-7,  6",
    " 0, -6",
    " 7,  6",
  ].join(" ")
  const femaleMarkers = endingLabelsGroup.selectAll(".female-marker")
    .data(educationIds)
    .enter().append("polygon")
    .attr("class", "ending-marker female-marker")
    .attr("points", trianglePoints)
    .attr("transform", d => `translate(+5, ${endYScale(d) + 20})`)

  // Create our legend container
  const legendGroup = bounds.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${dimensions.boundedWidth}, 5)`)

  const femaleLegend = legendGroup.append("g")
    .attr("transform", `translate(${
      - dimensions.endsBarWidth * 1.5
      + dimensions.endingBarPadding
      + 1
      }, 0)`)
  femaleLegend.append("polygon")
    .attr("points", trianglePoints)
    .attr("transform", "translate(-7, 0)")
  femaleLegend.append("text")
    .attr("class", "legend-text-left")
    .text("Company with > 1 studio")
    .attr("x", -20)
  femaleLegend.append("line")
    .attr("x1", -dimensions.endsBarWidth / 2 + 1)
    .attr("x2", -dimensions.endsBarWidth / 2 + 1)
    .attr("y1", 12)
    .attr("y2", 37)

  const maleLegend = legendGroup.append("g")
    .attr("transform", `translate(${
      - dimensions.endsBarWidth / 2
      - 4
      }, 0)`)
  maleLegend.append("circle")
    .attr("r", 5.5)
    .attr("transform", "translate(5, 0)")
  maleLegend.append("text")
    .attr("class", "legend-text-right")
    .text("1 Studio")
    .attr("x", 15)
  maleLegend.append("line")
    .attr("x1", dimensions.endsBarWidth / 2 - 3)
    .attr("x2", dimensions.endsBarWidth / 2 - 3)
    .attr("y1", 12)
    .attr("y2", 37)

  // Set up interactions
  const maximumPeople = 30
  let people = []
  const markersGroup = bounds.append("g")
    .attr("class", "markers-group")
  const endingBarGroup = bounds.append("g")
    .attr("transform", `translate(${dimensions.boundedWidth}, 0)`)

  function updateMarkers(elapsed) {
    // Animate progress along the path over a 5 s time period
    const xProgressAccessor = d => (elapsed - d.startTime) / 5000
    if (people.length < maximumPeople) {
      people = [
        ...people,
        ...d3.range(2).map(() => generatePerson(elapsed)),
      ]
    }

    // Female
    const females = markersGroup.selectAll(".marker-circle")
      .data(people.filter(d => (
        xProgressAccessor(d) < 1
        && sexAccessor(d) == 0
      )), d => d.id)
    females.enter().append("circle")
      .attr("class", "marker marker-circle")
      .attr("r", 5.5)
      .style("opacity", 0)
    females.exit().remove()

    // Male
    const males = markersGroup.selectAll(".marker-triangle")
      .data(people.filter(d => (
        xProgressAccessor(d) < 1
        && sexAccessor(d) == 1
      )), d => d.id)
    males.enter().append("polygon")
      .attr("class", "marker marker-triangle")
      .attr("points", trianglePoints)
      .style("opacity", 0)
    males.exit().remove()

    const markers = d3.selectAll(".marker")

    // Move our markers
    markers.style("transform", d => {
      const x = xScale(xProgressAccessor(d))
      const yStart = startYScale(sesAccessor(d))
      const yEnd = endYScale(educationAccessor(d))
      const yChange = yEnd - yStart
      const yProgress = yTransitionProgressScale(
        xProgressAccessor(d)
      )
      const y = yStart
        + (yChange * yProgress)
        + d.yJitter
      return `translate(${x}px, ${y}px)`
    })
      .attr("fill", d => colorScale(sesAccessor(d)))
      .transition().duration(100)
      .style("opacity", d => xScale(xProgressAccessor(d)) < 10
        ? 0
        : 1
      )

    // Where did people end up?
    const endingGroups = educationIds.map(endId => (
      people.filter(d => (
        xProgressAccessor(d) >= 1
        && educationAccessor(d) == endId
      ))
    ))
    const endingPercentages = d3.merge(
      endingGroups.map((peopleWithSameEnding, endingId) => (
        d3.merge(
          sexIds.map(sexId => (
            sesIds.map(sesId => {
              const peopleInBar = peopleWithSameEnding.filter(d => (
                sexAccessor(d) == sexId
              ))
              const countInBar = peopleInBar.length
              const peopleInBarWithSameStart = peopleInBar.filter(d => (
                sesAccessor(d) == sesId
              ))
              const count = peopleInBarWithSameStart.length
              const numberOfPeopleAbove = peopleInBar.filter(d => (
                sesAccessor(d) > sesId
              )).length

              return {
                endingId,
                sesId,
                sexId,
                count,
                countInBar,
                percentAbove: numberOfPeopleAbove / (peopleInBar.length || 1),
                percent: count / (countInBar || 1),
              }
            })
          ))
        )
      ))
    )



    // Draw the ending values
    endingLabelsGroup.selectAll(".ending-value")
      .data(endingPercentages)
      .join("text")
      .attr("class", "ending-value")
      .attr("x", d => (d.sesId) * 33
        + 89
      )
      .attr("y", d => endYScale(d.endingId)
        - dimensions.pathHeight / 2
        + 14 * d.sexId
        + 35
      )
      .attr("fill", d => d.countInBar
        ? colorScale(d.sesId)
        : "#dadadd"
      )
      .text(d => d.count)
  }
  d3.timer(updateMarkers)
}
drawLineChart()

// Helper functions
const getRandomNumberInRange = (min, max) => Math.random() * (max - min) + min

const getRandomValue = arr => arr[Math.floor(getRandomNumberInRange(0, arr.length))]

const sentenceCase = str => [
  str.slice(0, 1).toUpperCase(),
  str.slice(1),
].join("")
