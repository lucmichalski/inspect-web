// var DOMParser = require('xmldom').DOMParser
// var DOMImplementation = require('xmldom').DOMImplementation
// var XMLSerializer = require('xmldom').XMLSerializer

// self.DOMParser = { parseFromString: () => new Error('hej') }
// self.XMLSerializer = XMLSerializer

// self.document = {
//   implementation: new DOMImplementation(),
// }

// self.window = {
//   navigator,
// }

import { DOMParser, DOMImplementation, XMLSerializer } from 'xmldom'

class DOMParserFix extends DOMParser {
  constructor() {
    super()
  }

  parseFromString(str, str2) {
    return super.parseFromString(str.replace('<?xml version="1.0" encoding="utf-8"?>', ''), str2)
  }
}

self.Node = {
  ELEMENT_NODE: 1,
  ATTRIBUTE_NODE: 2,
  TEXT_NODE: 3,
  CDATA_SECTION_NODE: 4,
  ENTITY_REFERENCE_NODE: 5,
  ENTITY_NODE: 6,
  PROCESSING_INSTRUCTION_NODE: 7,
  COMMENT_NODE: 8,
  DOCUMENT_NODE: 9,
  DOCUMENT_TYPE_NODE: 10,
  DOCUMENT_FRAGMENT_NODE: 11,
  NOTATION_NODE: 12,
}

self.DOMParser = DOMParserFix
self.XMLSerializer = XMLSerializer

self.document = {
  implementation: new DOMImplementation(),
}

self.window = {
  navigator,
}

if (!self.window.Node) {
  var Node = {
    ELEMENT_NODE: 1,
    ATTRIBUTE_NODE: 2,
    TEXT_NODE: 3,
    CDATA_SECTION_NODE: 4,
    ENTITY_REFERENCE_NODE: 5,
    ENTITY_NODE: 6,
    PROCESSING_INSTRUCTION_NODE: 7,
    COMMENT_NODE: 8,
    DOCUMENT_NODE: 9,
    DOCUMENT_TYPE_NODE: 10,
    DOCUMENT_FRAGMENT_NODE: 11,
    NOTATION_NODE: 12,
  }
}

const { BlobServiceClient } = require('@azure/storage-blob')

onmessage = async function (e) {
  console.log('getAppsWorker got message: ' + e.data.team)

  const blobServiceClient = new BlobServiceClient(e.data.config)
  const { team } = e.data

  const containerClient = blobServiceClient.getContainerClient(team)

  const apps = {}

  for await (const blob of containerClient.listBlobsFlat()) {
    console.log('getAppsWorker[' + team + '] working on app: ' + blob.name)
    if (/^\//.test(blob.name)) {
      console.log('Bad filename: ' + blob.name)
      continue
    }

    const blockBlobClient = containerClient.getBlockBlobClient(blob.name)
    // fetch(blockBlobClient.url).then(response => console.log(response.json()))

    // const downloadBlockBlobResponse = await blockBlobClient.download(0)
    // console.log('\nDownloaded blob content...')
    // downloadBlockBlobResponse.blobBody.then(result => console.log(result))

    const nameParts = blob.name.match(/([^_]*?)((?=_)|$)/g).filter(s => s !== undefined && s.trim().length > 0)

    const name = nameParts[0]
    const commit = nameParts[1]
    const url = nameParts[2]

    const appName = name.replaceAll('-', '')

    if (!apps[appName]) {
      apps[appName] = {}
      apps[appName].name = name
      apps[appName].team = team
      apps[appName].results = []
    }

    const result = {}
    result.lastModified = blob.properties.lastModified
    result.commit = commit
    result.testUrl = url.replaceAll('-', '/')
    result.dataUrl = blockBlobClient.url
    // result.data

    const sameTestrun = apps[appName].results.find(r => r.commit === commit)

    if (sameTestrun) {
      sameTestrun.tests.push(result)
    } else {
      apps[appName].results.push({ commit, tests: [] })
    }

    apps[appName].latestBuild = apps[appName].results.sort(
      (a, b) => new Date(b.lastModified) - new Date(a.lastModified)
    )[0].commit
  }

  console.log('Posting message back to main script')
  postMessage(Object.values(apps))
}
