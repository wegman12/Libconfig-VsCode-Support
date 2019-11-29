'use strict';

import { BaseLibConfigNodeImpl } from './nodeImplementations';

export type LibConfigNode = 
	ObjectLibConfigNode |
	ArrayLibConfigNode |
	StringLibConfigNode |
	NumberLibConfigNode |
	BooleanLibConfigNode;

export interface BaseLibConfigNode {
	readonly type: 'object' | 'array' | 'list' | 'property' | 'string' | 'number' | 'boolean';
	readonly parent: ObjectLibConfigNode | LibConfigPropertyNode | null;
	offset: number;
	length: number;
	readonly children?: ScalarLibConfigNode[] | BaseLibConfigNode[] | LibConfigPropertyNode[];
	readonly value?: string | boolean | number | BaseLibConfigNode;

	addChild (child: ScalarLibConfigNode | BaseLibConfigNode | LibConfigPropertyNode): void;
}

export interface LibConfigPropertyNode extends BaseLibConfigNode {
	readonly type: 'property';
	name: string;
	readonly parent: ObjectLibConfigNode | null;
	readonly value: BaseLibConfigNode;
}

export interface ObjectLibConfigNode extends BaseLibConfigNode {
	readonly type: 'object';
	readonly parent: LibConfigPropertyNode;
	readonly children: LibConfigPropertyNode[];
}
export interface ArrayLibConfigNode extends BaseLibConfigNode {
	readonly type: 'array';
	readonly parent: LibConfigPropertyNode;
	readonly children: ScalarLibConfigNode[];
}
export interface ListLibConfigNode extends BaseLibConfigNode {
	readonly type: 'list';
	readonly parent: LibConfigPropertyNode;
	readonly children: BaseLibConfigNode[];
}

export interface ScalarLibConfigNode extends BaseLibConfigNode {
	readonly type: 'string' | 'number' | 'boolean';
	readonly parent: LibConfigPropertyNode;
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


