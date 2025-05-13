import { Base64 } from './base64.js'
import { util } from './crypto.js'
import { HMAC } from './hmac.js'
import { SHA1 } from './sha1.js'

const endpoint = 'https://lqdx1.oss-cn-hangzhou.aliyuncs.com'
const bucketName = 'lqdx1'
const OSSAccessKeyId = 'LTAI5tFxffoCWU6RuvK3SHzX'
const OssAccesskeySercet = 'MDBwyATBQAjME8zPhaRWSLgwRFSHXB'

function getV2Signature(method, date, resource, secret) {
  const stringToSign = [
    method,
    '',
    '',
    date,
    'x-oss-list-type:2',
    resource
  ].join('\n')

  const bytes = HMAC(SHA1, stringToSign, secret, { asBytes: true })
  return util.bytesToBase64(bytes)
}

export const listObjectsV2 = async (options = {}) => {
  const params = {
    'list-type': 2,
    'max-keys': options.maxKeys || 50,
    'prefix': options.prefix || '',
    'delimiter': options.delimiter || '/',
    'continuation-token': options.continuationToken || ''
  }

  const date = new Date().toUTCString()
  const canonicalizedResource = `/${bucketName}/`
  const signature = getV2Signature('GET', date, canonicalizedResource, OssAccesskeySercet)

  const queryString = Object.entries(params)
    .filter(([_, v]) => v)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&')

  const res = await uni.request({
    url: `${endpoint}/?${queryString}`,
    method: 'GET',
    header: {
      'Authorization': `OSS ${OSSAccessKeyId}:${signature}`,
      'Date': date,
      'x-oss-list-type': '2'
    }
  })

  if (res.statusCode !== 200) {
    throw new Error(`OSS请求失败: ${res.statusCode}`)
  }

  return {
    data: parseListV2Response(res.data),
    nextToken: parseListV2Response(res.data).nextContinuationToken
  }
}

function parseListV2Response(xml) {
  const getValue = (tag, str) => (str.match(new RegExp(`<${tag}>(.*?)</${tag}>`)) || [, ''])[1]

  return {
    objects: (xml.match(/<Contents>([\s\S]*?)<\/Contents>/g) || []).map(item => ({
      name: getValue('Key', item),
      size: parseInt(getValue('Size', item)) || 0,
      lastModified: getValue('LastModified', item)
    })),
    commonPrefixes: (xml.match(/<CommonPrefixes>([\s\S]*?)<\/CommonPrefixes>/g) || [])
      .map(item => ({
        prefix: getValue('Prefix', item)
      })),
    isTruncated: getValue('IsTruncated', xml) === 'true',
    nextContinuationToken: getValue('NextContinuationToken', xml)
  }
}

export const getFileUrl = (fileName) => {
  return `${endpoint}/${fileName.replace(/^\//, '')}`
}