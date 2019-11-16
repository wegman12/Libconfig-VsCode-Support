'use strict';

export interface LibConfigProperty {
	readonly name: string;
	readonly value: BaseLibConfigNode;
}

export type LibConfigNode = 
	ObjectLibConfigNode |
	ArrayLibConfigNode |
	StringLibConfigNode |
	NumberLibConfigNode |
	BooleanLibConfigNode;

export interface BaseLibConfigNode {
	readonly type: 'object' | 'array' | 'list' | 'property' | 'string' | 'number' | 'boolean';
	readonly parent?: ObjectLibConfigNode | LibConfigProperty;
	readonly offset: number;
	readonly length: number;
	readonly children?: ScalarLibConfigNode[] | LibConfigNode[] | LibConfigProperty[];
	readonly value?: string | boolean | number | null;

	addChild (child: ScalarLibConfigNode | LibConfigNode | LibConfigProperty): void;
}
export interface ObjectLibConfigNode extends BaseLibConfigNode {
	readonly type: 'object';
	readonly children: LibConfigProperty[];
}
export interface ArrayLibConfigNode extends BaseLibConfigNode {
	readonly type: 'array';
	readonly children: ScalarLibConfigNode[];
}
export interface ListLibConfigNode extends BaseLibConfigNode {
	readonly type: 'list';
	readonly children: LibConfigNode[];
}

export interface ScalarLibConfigNode extends BaseLibConfigNode {
	readonly type: 'string' | 'number' | 'boolean';
	readonly value: string | boolean | number;
}

export interface StringLibConfigNode extends ScalarLibConfigNode {
	readonly type: 'string';
	readonly value: string;
}
export interface NumberLibConfigNode extends ScalarLibConfigNode {
	readonly type: 'number';
	readonly value: number;
	readonly isInteger: boolean;
}
export interface BooleanLibConfigNode extends ScalarLibConfigNode {
	readonly type: 'boolean';
	readonly value: boolean;
}


