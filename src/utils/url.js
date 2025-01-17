/* @flow strict-local */
import type { ImageSource } from 'react-native/Libraries/Image/ImageSource';

import type { Auth } from '../api/transportTypes';
import { getAuthHeaders } from '../api/transport';
import { objectEntries } from '../flowPonyfill';

/**
 * An object `encodeParamsForUrl` can flatten.
 *
 * In principle the values should be strings; but we include some other
 * primitive types for which `toString` is just as good as `JSON.stringify`.
 */
export type UrlParamValue = string | boolean | number;
export type UrlParams = $ReadOnly<{| [string]: UrlParamValue | void |}>;

/**
 * Encode parameters as if for the URL query-part submitting an HTML form.
 *
 * Following the pattern of JSON.stringify, drop (rather than encoding in any
 * fashion) parameters whose provided value is `undefined`.
 */
export const encodeParamsForUrl = (params: UrlParams): string =>
  objectEntries(params)
    /* Filter out entries with `undefined` values, with type-level recognition.
       (Flow's core definitions treat `.filter(Boolean)` as a special case. See
       https://github.com/facebook/flow/issues/1414 for more information.) */
    .map(([key, value]): ?[string, UrlParamValue] => (value === undefined ? null : [key, value]))
    .filter(Boolean)
    /* Encode. */
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value.toString())}`)
    .join('&');

/**
 * Test for an absolute URL, assuming a valid URL.
 *
 * Specifically, we assume the input is a "valid URL string" as defined by
 * the URL Standard:
 *   https://url.spec.whatwg.org/#url-writing
 * and return true just if it's an "absolute-URL-with-fragment string".
 *
 * If the input is not a valid URL string, the result is unspecified.
 */
export const isUrlAbsolute = (url: string): boolean =>
  // True just if the string starts with a "URL-scheme string", then `:`.
  // Every "absolute-URL string" must do so.
  // Every "relative-URL string" must not do so: either it starts with a
  //   "path-relative-scheme-less-URL string", or it starts with `/`.
  url.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:/) !== null;

/**
 * Test for a relative URL string, assuming a valid URL.
 *
 * Specifically, we assume the input is a "valid URL string" as defined by
 * the URL Standard:
 *   https://url.spec.whatwg.org/#url-writing
 * and return true just if it's a "relative-URL-with-fragment string".
 *
 * If the input is not a valid URL string, the result is unspecified.
 */
export const isUrlRelative = (url: string): boolean => !isUrlAbsolute(url);

/**
 * Test for a path-absolute URL string, assuming a valid URL.
 *
 * Specifically, we assume the input is a "valid URL string" as defined by
 * the URL Standard:
 *   https://url.spec.whatwg.org/#url-writing
 * and return true just if it's a "path-absolute-URL string".
 *
 * This is the kind like "/foo/bar" that keeps the part of the base URL
 * before the path, and replaces the rest.
 *
 * Specifically this is a kind of relative URL string: so when this returns
 * true (for a valid URL), `isUrlRelative` will always also return true and
 * `isUrlAbsolute` will return false.
 */
export const isUrlPathAbsolute = (url: string): boolean =>
  // A "path-absolute URL string" must start with `/` and not `//`.
  // On the other hand:
  //  * a "path-relative scheme-less-URL string" must not start with `/`;
  //  * the other forms of "relative-URL string" all must start with `//`.
  !!url.match(/^\/($|[^\/])/); // eslint-disable-line no-useless-escape
// ESLint says one of these slashes could be written unescaped.
//   But that seems like a recipe for confusion, so we escape them both.

/** Just like `new URL`, but on error return undefined instead of throwing. */
export const tryParseUrl = (url: string, base?: string | URL): URL | void => {
  try {
    return new URL(url, base);
  } catch {
    return undefined;
  }
};

/**
 * Test if the given URL is within the given realm.
 */
export const isUrlOnRealm = (url: URL, realm: URL): boolean => url.origin === realm.origin;

const getResourceWithAuth = (url: URL, auth: Auth) => ({
  uri: url.toString(),
  headers: getAuthHeaders(auth),
});

const getResourceNoAuth = (url: URL) => ({
  uri: url.toString(),
});

/**
 * From a URL and an Auth, give RN's ImageSource type.
 *
 * ImageSource is what React Native's `Image` component expects for its
 * `source` prop: https://reactnative.dev/docs/0.67/image#imagesource
 *
 * It's also what react-native-photo-view is documented as expecting for its
 * `source` prop: https://github.com/alwx/react-native-photo-view#properties
 *
 * > source | Object | same as source for other React images
 */
export const getResource = (url: URL, auth: Auth): ImageSource =>
  isUrlOnRealm(url, auth.realm) ? getResourceWithAuth(url, auth) : getResourceNoAuth(url);

export const getFileExtension = (filename: string): string => filename.split('.').pop();

export const isUrlAnImage = (url: string): boolean =>
  ['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(getFileExtension(url).toLowerCase());

const mimes = {
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  mov: 'video/quicktime',
};

export const getMimeTypeFromFileExtension = (extension: string): string =>
  mimes[extension.toLowerCase()] || 'application/octet-stream';
