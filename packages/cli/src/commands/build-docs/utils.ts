import { createElement } from 'react';
import { createStore, Redoc } from '@fakeyanss/redoc';
import { Config, isAbsoluteUrl } from '@fakeyanss/redocly-openapi-core';

import { renderToString } from 'react-dom/server';
import { ServerStyleSheet } from 'styled-components';
import { compile } from 'handlebars';
import { dirname, join, resolve } from 'path';
import { existsSync, lstatSync, readFileSync } from 'fs';

import type { BuildDocsOptions } from './types';
import { red } from 'colorette';
import { exitWithError } from '../../utils';

export function getObjectOrJSON(
  openapiOptions: string | Record<string, unknown>,
  config: Config
): JSON | Record<string, unknown> | Config {
  switch (typeof openapiOptions) {
    case 'object':
      return openapiOptions;
    case 'string':
      try {
        if (existsSync(openapiOptions) && lstatSync(openapiOptions).isFile()) {
          return JSON.parse(readFileSync(openapiOptions, 'utf-8'));
        } else {
          return JSON.parse(openapiOptions);
        }
      } catch (e) {
        process.stderr.write(
          red(
            `Encountered error:\n\n${openapiOptions}\n\nis neither a file with a valid JSON object neither a stringified JSON object.`
          )
        );
        exitWithError(e);
      }
      break;
    default: {
      if (config) {
        process.stderr.write(`Found ${config.configFile} and using theme.openapi options\n`);

        return config.theme.openapi ? config.theme.openapi : {};
      }
      return {};
    }
  }
  return {};
}

export async function getPageHTML(
  api: any,
  pathToApi: string,
  {
    title,
    disableGoogleFont,
    templateFileName,
    templateOptions,
    redocOptions = {},
    redocCurrentVersion,
  }: BuildDocsOptions,
  configPath?: string
) {
  process.stderr.write('Prerendering docs\n');

  const apiUrl = redocOptions.specUrl || (isAbsoluteUrl(pathToApi) ? pathToApi : undefined);
  const store = await createStore(api, apiUrl, redocOptions);
  const sheet = new ServerStyleSheet();

  const html = renderToString(sheet.collectStyles(createElement(Redoc, { store })));
  const state = await store.toJS();
  const css = sheet.getStyleTags();

  templateFileName = templateFileName
    ? templateFileName
    : redocOptions?.htmlTemplate
    ? resolve(configPath ? dirname(configPath) : '', redocOptions.htmlTemplate)
    : join(__dirname, './template.hbs');
  const template = compile(readFileSync(templateFileName).toString());
  console.log('redoc version:', redocCurrentVersion)
  const redocJsContent = readFileSync(join(__dirname, `./redoc/redoc.standalone.js`), 'utf-8');
  return template({
    redocHTML: `
      <div id="redoc">${html || ''}</div>
      <script>
      ${`const __redoc_state = ${sanitizeJSONString(JSON.stringify(state))};` || ''}

      var container = document.getElementById('redoc');
      Redoc.${'hydrate(__redoc_state, container)'};

      </script>`,
    redocHead:
      // `<script src="https://cdn.redoc.ly/redoc/v${redocCurrentVersion}/bundles/redoc.standalone.js"></script>` +
      `<script>${redocJsContent}</script>` +
      css,
    title: title || api.info.title || 'ReDoc documentation',
    disableGoogleFont,
    templateOptions,
  });
}

export function sanitizeJSONString(str: string): string {
  return escapeClosingScriptTag(escapeUnicode(str));
}

// see http://www.thespanner.co.uk/2011/07/25/the-json-specification-is-now-wrong/
export function escapeClosingScriptTag(str: string): string {
  return str.replace(/<\/script>/g, '<\\/script>');
}

// see http://www.thespanner.co.uk/2011/07/25/the-json-specification-is-now-wrong/
export function escapeUnicode(str: string): string {
  return str.replace(/\u2028|\u2029/g, (m) => '\\u202' + (m === '\u2028' ? '8' : '9'));
}
