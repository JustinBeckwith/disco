import axios, {AxiosError, AxiosRequestConfig} from 'axios';
import {EventEmitter} from 'events';
import * as fs from 'fs';
import * as rax from 'retry-axios';

import {FragmentResponse, Schema, SchemaResource, Schemas} from './types';

/**
 * Re-export all of the underlying types so they can be used easily
 * by the consuming module.
 */
export {FragmentResponse, HttpMethod, ParameterFormat, Schema, SchemaItem, SchemaItems, SchemaMethod, SchemaMethods, SchemaParameter, SchemaParameters, SchemaResource, SchemaResources, Schemas, SchemaType} from './types';

export const DISCOVERY_URL = 'https://www.googleapis.com/discovery/v1/apis/';
export const FRAGMENT_URL =
    'https://storage.googleapis.com/apisnippets-staging/public/';

export interface DownloadOptions {
  includePrivateApis?: boolean;
  exportPath?: string;
}

export interface SchemaError {
  err: Error;
  schema: Schema;
}

export declare interface DiscoEvents {
  on(event: 'statusMessage', listener: (message: string) => void): this;
  on(event: 'schemaStart', listener: (schema: Schema) => void): this;
  on(event: 'schemaDone', listener: (schema: Schema) => void): this;
  on(event: 'schemaError', listener: (info: SchemaError) => void): this;
  on(event: 'discoveryDownloaded', listener: (schemas: Schemas) => void): this;
  on(event: 'fragmentDownloaded',
     listener: (fragment: FragmentResponse) => void): this;
  on(event: 'fragmentStart', listener: (path: string) => void): this;
}

const ax = axios.create();
ax.defaults = {
  raxConfig: {instance: ax, noResponseRetries: 3}
} as rax.RaxConfig;
rax.attach(ax);

export class Disco extends EventEmitter implements DiscoEvents {
  /**
   * Get a list of Google APIs from apiary, and iterate over each one.
   * Obtain all of the API schema data (including code fragments),
   * and dump out a large (over 18MB!) file containing all the data.
   * Optionally save it to disk,.
   * @param options
   */
  async download(options: DownloadOptions = {}): Promise<Schemas> {
    // Some APIs will only be populated if run inside of Google's network
    // (crazy, right?).  By default this will be turned off.
    const headers = options.includePrivateApis ? {} : {'X-User-Ip': '0.0.0.0'};
    const url = DISCOVERY_URL;

    // Obtain the top level schema document, with all the APIs.
    const res = await ax.request<Schemas>({url, headers});
    const apis = res.data.items;

    this.emit('discoveryDownloaded', res.data);

    // Iterate over each API returned, and obtain the sub-API spec doc.
    const jobs = apis.map(async api => {
      try {
        this.emit('schemaStart', api);
        const res = await ax.request<Schema>({url: api.discoveryRestUrl});
        const schema = res.data;

        // For each API, go download all the code fragments if
        // available.
        await this.populateFragmentsForSchema(
            api.discoveryRestUrl, schema,
            `${FRAGMENT_URL}${schema.name}/${schema.version}/0/${schema.name}`);
        this.emit('schemaDone', api);
        return schema;
      } catch (e) {
        const err = e as AxiosError;
        e.message = `Error generating schema. ${e.message}`;
        if (err.response && err.response.status === 404) {
          this.emit('schemaError', {err: e, schema: api});
          return null;
        }
        throw err;
      }
    });
    const items = (await Promise.all(jobs)).filter(x => !!x);

    // Create a new results object, and put the modified Schema objects back
    // into it.  This new object contains the code fragments that weren't in the
    // original.
    const results = res.data;
    results.items = items as Schema[];
    if (options.exportPath) {
      fs.writeFileSync(options.exportPath, JSON.stringify({items}));
    }
    return results;
  }

  /**
   * Given a schema, this method goes out to GCS, and looks for a snippet
   * file that contains samples in a variety of languages.  The majority of
   * these calls will return a 403, because there aren't samples for most of
   * the APIs.  This creates an HTTP call for each method of each resource
   * in the Schema... so it can take a while.  Ideally, we could just download
   * a single large blob with all the fragments and sort through it after.
   */
  private async populateFragmentsForSchema(
      apiDiscoveryUrl: string, schema: SchemaResource, apiPath: string) {
    if (schema.methods) {
      for (const methodName in schema.methods) {
        if (schema.methods.hasOwnProperty(methodName)) {
          const methodSchema = schema.methods[methodName];
          methodSchema.sampleUrl = `${apiPath}.${methodName}.frag.json`;
          try {
            const path = `${apiPath}.${methodName}`.slice(58);
            this.emit('fragmentStart', path);
            const res = await ax.request<FragmentResponse>(
                {url: methodSchema.sampleUrl});
            const fragment = res.data.codeFragment['Node.js'];
            if (fragment) {
              schema.methods[methodName].fragment = fragment.fragment;
              this.emit('fragmentDownloaded', fragment.fragment);
            }
          } catch (e) {
            const err = e as AxiosError;
            if (!err.response || err.response.status !== 403) {
              throw e;
            }
          }
        }
      }
    }
    if (schema.resources) {
      for (const resourceName in schema.resources) {
        if (schema.resources.hasOwnProperty(resourceName)) {
          await this.populateFragmentsForSchema(
              apiDiscoveryUrl, schema.resources[resourceName],
              `${apiPath}.${resourceName}`);
        }
      }
    }
  }
}

const disco = new Disco();
export {disco};
