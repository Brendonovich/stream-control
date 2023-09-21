// This file was generated by [rspc](https://github.com/oscartbeaumont/rspc). Do not edit this file manually.

export type Procedures = {
    queries: 
        { key: "fs.list", input: string, result: Entry[] } | 
        { key: "http.json", input: HTTPRequest, result: { data: any; status: number } } | 
        { key: "http.text", input: HTTPRequest, result: { data: string; status: number } },
    mutations: 
        { key: "oauth.run", input: string, result: any | null },
    subscriptions: never
};

export type HTTPRequest = { url: string; method: HTTPMethod; headers?: { [key: string]: string }; body?: HTTPBody | null }

export type HTTPBody = { Json: any } | { Form: { [key: string]: string } }

export type Entry = { Dir: string } | { File: string }

export type HTTPMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
