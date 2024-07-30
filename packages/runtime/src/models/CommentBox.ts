import { createMutable } from "solid-js/store";
import type * as v from "valibot";

import type { serde } from "@macrograph/runtime-serde";
import type { Size, XY } from "../utils";
import type { Graph } from "./Graph";
import type { Node } from "./Node";

export interface CommentBoxArgs {
	id: number;
	graph: Graph;
	position: XY;
	size: XY;
	text: string;
	tint?: string;
}

export type GetNodeSize = (node: Node) => Size | undefined;

type Serialized = v.InferOutput<typeof serde.CommentBox>;

export class CommentBox {
	id: number;
	graph: Graph;
	position: XY;
	size: XY;
	text: string;
	tint: string;

	constructor(args: CommentBoxArgs) {
		this.id = args.id;
		this.graph = args.graph;
		this.position = args.position;
		this.size = args.size;
		this.text = args.text;
		this.tint = args.tint ?? "#FFF";

		return createMutable(this);
	}

	getNodes(nodes: IterableIterator<Node>, getNodeSize: GetNodeSize) {
		const { size, position } = this;

		const ret = new Set<Node>();

		for (const node of nodes) {
			const nodePosition = node.state.position;

			if (nodePosition.x < position.x || nodePosition.y < position.y) continue;

			const nodeSize = getNodeSize(node);
			if (!nodeSize) continue;

			if (
				nodePosition.x + nodeSize.width > position.x + size.x ||
				nodePosition.y + nodeSize.height > position.y + size.y
			)
				continue;

			ret.add(node);
		}

		return ret;
	}

	serialize(): Serialized {
		return {
			id: this.id,
			position: this.position,
			size: this.size,
			text: this.text,
			tint: this.tint,
		};
	}

	static deserialize(graph: Graph, data: Serialized): CommentBox | null {
		return new CommentBox({
			graph,
			id: data.id ?? graph.generateId(),
			position: data.position,
			size: data.size,
			text: data.text,
			tint: data.tint,
		});
	}
}
