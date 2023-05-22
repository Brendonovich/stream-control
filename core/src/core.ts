// This file was generated by [rspc](https://github.com/oscartbeaumont/rspc). Do not edit this file manually.

export type Procedures = {
    queries: 
        { key: "http.json", input: HTTPRequest, result: { data: any; status: number } } | 
        { key: "http.text", input: HTTPRequest, result: { data: string; status: number } },
    mutations: never,
    subscriptions: 
        { key: "auth.twitch", input: never, result: Message }
};

export type HTTPRequest = { url: string; method: HTTPMethod; headers?: { [key: string]: string } | null; body?: HTTPBody | null }

export type HTTPBody = { Json: any } | { Form: { [key: string]: string } }

export type Message = "Listening" | { Received: { accessToken: string; refreshToken: string } }

export type HTTPMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
