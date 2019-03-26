const request = require('request')
const jetpack = require('fs-jetpack')
const Async = require('crocks/Async')
const { curry } = require('crocks')

// String -> Async({ }, { })
const checkSite = (url) => Async((reject, resolve) => {
  const requestMs = Date.now()
  request(url, (error, response, body) => {
    const responseMs = Date.now()

    if (error) {
      reject({ requestMs, responseMs, error })
    } else {
      resolve({ requestMs, responseMs, response, body })
    }
  })
})

// { } -> String
const formatOutput = response => {
  const success = response.error ? 0 : 1

  const delta = response.responseMs - response.requestMs
  console.log(`${success === 1 ? 'P' : 'F'} ${delta}`)

  return `${success},${response.requestMs},${response.responseMs},${delta}\n`
}

// String -> String
const appendFile = (filePath, data) => {
  jetpack.append(filePath, data)

  return filePath
}

// String -> { } -> Async((), String)
const formatAndAppendFile = curry((filePath, response) => {
  return appendFile(filePath, formatOutput(response))
})

// String -> String -> Async(.., ..)
const checkAndAppendResult = (url, filePath) => Async((reject, resolve) => {
  checkSite(url)
  .fork(
    r => {
      formatAndAppendFile(filePath, r)
      reject()
    },
    r => {
      formatAndAppendFile(filePath, r)
      resolve()
    }
  )
})

const checkForever = (url, filePath) => {
  checkAndAppendResult(url, filePath)
  .fork(
    // do again...

    // we check every half-minute when the server is erroring
    () => setTimeout(() => checkForever(url, filePath), 1000 * 30),
    // we check every minute when the site is responding (even if very slowly)
    () => setTimeout(() => checkForever(url, filePath), 1000 * 60)
  )
}

if (!process.argv[2] || !process.argv[3]) {
  console.error('Need all arguments!')
  process.exit(1)
}

console.log(`profiling ${process.argv[2]} and writing results to ${process.argv[3]}`)

const url = process.argv[2]
const outFile = process.argv[3]

checkForever(url, outFile)
