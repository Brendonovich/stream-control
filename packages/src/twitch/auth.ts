import { Core, Maybe, OAuthToken } from "@macrograph/core";
import { ReactiveMap } from "@solid-primitives/map";
import { z } from "zod";
import { createHelixEndpoint } from "./helix";

const USER_DATA = z.object({
  id: z.string(),
  login: z.string(),
  display_name: z.string(),
});

const TOKENS_LOCALSTORAGE = "twitchTokens";

export function createAuth(clientId: string, core: Core) {
  const accounts = new ReactiveMap<
    string,
    {
      token: OAuthToken;
      data: z.infer<typeof USER_DATA>;
      refreshTimer: ReturnType<typeof setTimeout>;
    }
  >();

  Maybe(localStorage.getItem(TOKENS_LOCALSTORAGE))
    .map(JSON.parse)
    .map((tokens) => {
      Object.values(tokens).forEach((token: any) => addToken(token));
    });

  function persistTokens() {
    const tokens = [...accounts.values()].reduce(
      (acc, account) => ({
        [account.data.id]: account.token,
        ...acc,
      }),
      {} as Record<string, OAuthToken>
    );

    localStorage.setItem(TOKENS_LOCALSTORAGE, JSON.stringify(tokens));
  }

  async function addToken(token: OAuthToken) {
    const api = createHelixEndpoint(clientId, () => token.access_token);

    const data = await api.users.get(USER_DATA);

    accounts.set(data.id, {
      token,
      data,
      refreshTimer: setTimeout(
        () => refresh(data.id),
        token.issued_at + token.expires_in - Date.now()
      ),
    });

    persistTokens();
  }

  async function refresh(id: string) {
    const account = Maybe(accounts.get(id)).unwrap();

    const token = await core.oauth.refresh(
      "twitch",
      account.token.refresh_token
    );

    await addToken(token);
  }

  return {
    accounts,
    clientId,
    addToken,
    refresh,
    logOut(id: string) {
      accounts.delete(id);

      persistTokens();
    },
  };
}

export type Auth = ReturnType<typeof createAuth>;
