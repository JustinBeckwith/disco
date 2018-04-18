import axios, {AxiosError} from 'axios';
import {EventEmitter} from 'events';
import * as fs from 'fs';

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

export declare interface DiscoEvents {
  on(event: 'schemaError', listener: (err: Error) => void): this;
}

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
    const res = await axios.request<Schemas>({url, headers});
    const apis = res.data.items;

    // Iterate over each API returned, and obtain the sub-API spec doc.
    const jobs = apis.map(async api => {
      try {
        const res = await axios.request<Schema>({url: api.discoveryRestUrl});
        const schema = res.data;

        // For each API, go download all the code fragments if
        // available.
        await this.populateFragmentsForSchema(
            api.discoveryRestUrl, schema,
            `${FRAGMENT_URL}${schema.name}/${schema.version}/0/${schema.name}`);
        return schema;
      } catch (e) {
        e.message = `Error generating schema. ${e.message}`;
        this.emit('schemaError', e);
        return null;
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
            const res = await axios.request<FragmentResponse>(
                {url: methodSchema.sampleUrl});
            const fragment = res.data.codeFragment['Node.js'];
            if (fragment) {
              schema.methods[methodName].fragment = fragment.fragment;
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
