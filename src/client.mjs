import fetch from "node-fetch";
import dotenv from "dotenv";

import apolloClient from "apollo-client";
import { HttpLink } from "apollo-link-http";
import { setContext } from "apollo-link-context";
import { InMemoryCache } from "apollo-cache-inmemory";

const { ApolloClient } = apolloClient;

dotenv.config();
const token = process.env.TOKEN;

const authLink = setContext((_, { headers }) => {
	return {
		headers: {
			...headers,
			authorization: "Bearer " + token
		}
	}
});

export const client = new ApolloClient({
	link: authLink.concat(new HttpLink({ uri: "https://api.github.com/graphql", fetch })),
	cache: new InMemoryCache(),
});