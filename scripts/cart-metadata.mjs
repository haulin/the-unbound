export const CartMeta = {
  version: '0.0.7',
  author: 'haulin',
  script: 'js',
  input: 'mouse',
}

export function cartTitle() {
  return `The Unbound (prototype ${CartMeta.version})`
}

export function cartDesc() {
  return `Prototype ${CartMeta.version} toward the North Star`
}

export function metadataBlockLines() {
  return [
    `// title:  ${cartTitle()}`,
    `// author: ${CartMeta.author}`,
    `// desc:   ${cartDesc()}`,
    `// script: ${CartMeta.script}`,
    `// input:  ${CartMeta.input}`,
  ]
}

export function licenseLines() {
  return [
    `// SPDX-License-Identifier: MIT`,
    `// Copyright (c) 2026 ${CartMeta.author}`,
    `// See LICENSE for full text.`,
  ]
}

export function bannerText() {
  // IMPORTANT: Keep metadata lines contiguous at the top of the cart.
  return metadataBlockLines().concat(['']).concat(licenseLines()).concat(['', '']).join('\n')
}

export function footerText() {
  // Guard against TIC website metadata parsing quirks by repeating at EOF.
  return [''].concat(metadataBlockLines()).concat(['']).join('\n')
}

