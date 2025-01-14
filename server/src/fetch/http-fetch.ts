import type events from 'events';
import type stream from 'stream';
import type followRedirects from 'follow-redirects';
import type { IncomingMessage } from 'http';
import type { Readable } from 'stream';
import { HttpFetchBufferOptions, HttpFetchJsonOptions, HttpFetchOptions, HttpFetchReadableOptions, HttpFetchResponse, HttpFetchResponseType, HttpFetchTextOptions, checkStatus, createStringOrBufferBody, getFetchMethod, setDefaultHttpFetchAccept } from '.';
export type { HttpFetchBufferOptions, HttpFetchJsonOptions, HttpFetchOptions, HttpFetchReadableOptions, HttpFetchResponse, HttpFetchResponseType, HttpFetchTextOptions, checkStatus, setDefaultHttpFetchAccept } from '.';

async function readMessageBuffer(response: IncomingMessage) {
    const buffers: Buffer[] = [];
    response.on('data', buffer => buffers.push(buffer));
    const { once } = require('events') as typeof events;
    await once(response, 'end');
    return Buffer.concat(buffers);
}

export interface FetchParser<T> {
    parse(message: IncomingMessage): Promise<T>;
}

const TextParser: FetchParser<string> = {
    async parse(message: IncomingMessage) {
        return (await readMessageBuffer(message)).toString();
    }
}
const JSONParser: FetchParser<any> = {
    async parse(message: IncomingMessage) {
        return JSON.parse((await readMessageBuffer(message)).toString());
    }
}

const BufferParser: FetchParser<Buffer> = {
    async parse(message: IncomingMessage) {
        return readMessageBuffer(message);
    }
}

const StreamParser: FetchParser<IncomingMessage> = {
    async parse(message: IncomingMessage) {
        return message;
    }
}

export function getHttpFetchParser(responseType: HttpFetchResponseType) {
    switch (responseType) {
        case 'json':
            return JSONParser;
        case 'text':
            return TextParser;
        case 'readable':
            return StreamParser;
    }
    return BufferParser;
}

export function httpFetchParseIncomingMessage(readable: IncomingMessage, responseType: HttpFetchResponseType) {
    return getHttpFetchParser(responseType).parse(readable);
}

export async function httpFetch<T extends HttpFetchOptions<Readable>>(options: T): Promise<HttpFetchResponse<
    // first one serves as default.
    T extends HttpFetchBufferOptions<Readable> ? Buffer
    : T extends HttpFetchTextOptions<Readable> ? string
    : T extends HttpFetchReadableOptions<Readable> ? IncomingMessage
    : T extends HttpFetchJsonOptions<Readable> ? any : Buffer
>> {
    const headers = new Headers(options.headers);
    setDefaultHttpFetchAccept(headers, options.responseType);

    const { once } = require('events') as typeof events;
    const { PassThrough, Readable } = require('stream') as typeof stream;
    const { http, https } = require('follow-redirects') as typeof followRedirects;

    const { url } = options;
    const isSecure = url.toString().startsWith('https:');
    const proto = isSecure ? https : http;

    let { body } = options;
    if (body && !(body instanceof Readable)) {
        const newBody = new PassThrough();
        newBody.write(Buffer.from(createStringOrBufferBody(headers, body)));
        newBody.end();
        body = newBody;
    }

    const nodeHeaders: Record<string, string[]> = {};
    for (const [k, v] of headers) {
        if (nodeHeaders[k]) {
            nodeHeaders[k].push(v);
        }
        else {
            nodeHeaders[k] = [v];
        }
    }

    const request = proto.request(url, {
        method: getFetchMethod(options),
        rejectUnauthorized: options.rejectUnauthorized,
        family: options.family,
        headers: nodeHeaders,
        timeout: options.timeout,
    });

    if (body)
        body.pipe(request);
    else
        request.end();
    const [response] = await once(request, 'response') as [IncomingMessage];

    if (!options?.ignoreStatusCode) {
        try {
            checkStatus(response.statusCode);
        }
        catch (e) {
            readMessageBuffer(response).catch(() => { });
            throw e;
        }
    }

    const incomingHeaders = new Headers();
    for (const [k, v] of Object.entries(response.headers)) {
        for (const vv of (typeof v === 'string' ? [v] : v)) {
            incomingHeaders.append(k, vv)
        }
    }

    return {
        statusCode: response.statusCode,
        headers: incomingHeaders,
        body: await httpFetchParseIncomingMessage(response, options.responseType),
    };
}

function ensureType<T>(v: T) {
}

async function test() {
    const a = await httpFetch({
        url: 'http://example.com',
    });

    ensureType<Buffer>(a.body);

    const b = await httpFetch({
        url: 'http://example.com',
        responseType: 'json',
    });
    ensureType<any>(b.body);

    const c = await httpFetch({
        url: 'http://example.com',
        responseType: 'readable',
    });
    ensureType<IncomingMessage>(c.body);

    const d = await httpFetch({
        url: 'http://example.com',
        responseType: 'buffer',
    });
    ensureType<Buffer>(d.body);
}
