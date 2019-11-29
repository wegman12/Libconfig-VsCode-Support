'use strict'

import {
	LibConfigPropertyNode,
	BaseLibConfigNode,
	LibConfigNode,
	ObjectLibConfigNode,
	ScalarLibConfigNode,
	ListLibConfigNode,
	ArrayLibConfigNode,
	StringLibConfigNode,
	NumberLibConfigNode,
	BooleanLibConfigNode
} from './nodeInterfaces';


export abstract class BaseLibConfigNodeImpl implements BaseLibConfigNode {
	public readonly abstract type: 'object' | 'array' | 'list' | 'property' | 'string' | 'number' | 'boolean';
	
	/**
	 * Error callback functions which are called whenever an error occurs
	 */
	protected errorCallbacks: Array<(errorInfo:string, start:number, length:number) => void> = [];
	
	/**
	 * Add a callback function which is called whenever an error occurs
	 * @param func The callback function being added
	 */
	public addErrorCallback(func:((errorInfo:string, start:number, length:number)=>void)){
		this.errorCallbacks.push(func);
	}

	/**
	 * Calls all callback functions with the necissary error information
	 * @param errorInfo The error information for the call
	 */
	protected Error(errorInfo:string, start:number, length:number){
		this.errorCallbacks.map((value)=>{
			value(errorInfo, start, length);
		});
	}

	public offset: number;
	public length: number = 0;
	public abstract readonly parent: ObjectLibConfigNode | LibConfigPropertyNode | null;
	public abstract addChild (child: ScalarLibConfigNode | BaseLibConfigNode | LibConfigPropertyNode): void;

	constructor(
		offset: number, 
		length: number,
		callbacks?: Array<(errorInfo: string) => void>) {
		this.offset = offset;
		this.length = length;

		if(callbacks)
			callbacks.map((value)=> { this.addErrorCallback });
	}

	public toString(): string {
		return 'type: ' + this.type + ' (' + this.offset + '/' + this.length + ')' + (this.parent ? ' parent: {' + this.parent.toString() + '}' : '');
	}
}


export class LibConfigPropertyNodeImpl extends BaseLibConfigNodeImpl implements LibConfigPropertyNode {
	public readonly type: 'property' = 'property';
	public readonly parent: ObjectLibConfigNode | null;
	public name: string;
	public readonly value?: BaseLibConfigNode;

	constructor(
		parent: ObjectLibConfigNode | null,
		offset: number,
		length: number,
		name: string,
		value?: BaseLibConfigNode
	) {
		super(
			offset,
			length
		);
		this.parent = parent;
		this.name = name;
		if(value)
			this.value = value;
	}

	/**
	 * Implementation of function, logs a console error
	 */
	public addChild (child: ScalarLibConfigNode | LibConfigNode | LibConfigPropertyNode): void {
		console.error('Trying to add child to property value');
	}

}

export class ObjectLibConfigNodeImpl extends BaseLibConfigNodeImpl implements ObjectLibConfigNode {
	public readonly type: 'object' = 'object';
	private _properties: LibConfigPropertyNode[] = [];
	public readonly parent: LibConfigPropertyNode;
	
	constructor(
		parent: LibConfigPropertyNode, 
		offset: number, 
		length: number,
		properties: LibConfigPropertyNode[],
		callbacks?: Array<(errorInfo: string) => void>) {
		super(
			offset, 
			length,
			callbacks
		);
		this.parent = parent;

		this.addChildren(properties);
	}

	/**
	 * Convenience function to add children to the property map
	 * 
	 * @param children The children to be added
	 */
	public addChildren(children: LibConfigPropertyNode[]): void {
		children.map((value) => {
			this.addChild(value)
		});
	}

	/**
	 * Tries to add child to @_properties array
	 * 
	 * @Error callbacks are executed if @child does not pass @validate
	 * 
	 * @param child Child to add to the @_properties array
	 */
	public addChild (child: LibConfigPropertyNode): void {
		
		if(!this.validate(child)) return;
		this._properties.push(child);
	}

	/**
	 * Verifies that the child can be added to @_properties
	 * 
	 * @param child The child to validate
	 */
	private validate (child: LibConfigPropertyNode): boolean {
		let invalid:boolean = false;
		this._properties.map((value, index, array) => {
			if(value.name === child.name){
				this.Error(`Duplicate properties with name '${value.name}' found!`, child.parent.offset, child.parent.length)
				invalid = true;
			}
		});

		return !invalid;
	}
	
	/**
	 * Public getter to obtain properties from @_properties
	 */
	public get children(): LibConfigPropertyNode[] {
		return this._properties;
	}
}

export class ListLibConfigNodeImpl extends BaseLibConfigNodeImpl implements ListLibConfigNode {
	public readonly type: 'list' = 'list';
	private _children: BaseLibConfigNode[] = [];
	public readonly parent: LibConfigPropertyNode;
	
	constructor(
		parent: LibConfigPropertyNode, 
		offset: number, 
		length: number,
		children: LibConfigNode[],
		callbacks?: Array<(errorInfo: string) => void>) {
		super(
			offset, 
			length,
			callbacks
		);

		this.parent = parent;
		this.addChildren(children);
	}

	/**
	 * Convenience function to add children to the property map
	 * 
	 * @param children The children to be added
	 */
	public addChildren(children: BaseLibConfigNode[]): void {
		children.map((value) => {
			this.addChild(value)
		});
	}

	/**
	 * Tries to add child to @_children array
	 * 
	 * @Error callbacks are executed if @child does not pass @validate
	 * 
	 * @param child Child to add to the @_children array
	 */
	public addChild (child: BaseLibConfigNode): void {
		
		if(!this.validate(child)) return;
		this._children.push(child);
	}

	/**
	 * Verifies that the child can be added to @_children
	 * 
	 * @param child The child to validate
	 */
	private validate (child: BaseLibConfigNode): boolean {
		let invalid:boolean = false;

		return !invalid;
	}
	
	/**
	 * Public getter to obtain properties from @_children
	 */
	public get children(): BaseLibConfigNode[] {
		return this._children;
	}
}

export class ArrayLibConfigNodeImpl extends BaseLibConfigNodeImpl implements ArrayLibConfigNode {
	public readonly type: 'array' = 'array';
	private _children: ScalarLibConfigNode[] = [];
	readonly parent: LibConfigPropertyNode;
	
	constructor(
		parent: LibConfigPropertyNode, 
		offset: number, 
		length: number,
		children: ScalarLibConfigNode[],
		callbacks?: Array<(errorInfo: string) => void>) {
		super(
			offset, 
			length,
			callbacks
		);
		this.parent = parent;
		this.addChildren(children);
	}

	/**
	 * Convenience function to add children to the property map
	 * 
	 * @param children The children to be added
	 */
	public addChildren(children: ScalarLibConfigNode[]): void {
		children.map((value) => {
			this.addChild(value)
		});
	}

	/**
	 * Tries to add child to @_children array
	 * 
	 * @Error callbacks are executed if @child does not pass @validate
	 * 
	 * @param child Child to add to the @_children array
	 */
	public addChild (child: ScalarLibConfigNode): void {
		
		if(!this.validate(child)) {
			this.Error('Error adding child to list', child.offset, child.length);
			return;
		}
		this._children.push(child);
	}

	/**
	 * Verifies that the child can be added to @_children
	 * 
	 * @param child The child to validate
	 */
	private validate (child: ScalarLibConfigNode): boolean {
		let invalid:boolean = false;

		let type:'string' | 'number' | 'boolean' = this._children.length > 0 ? this._children[0].type : child.type;

		if(type !== child.type){
			this.Error(`Array must have consistent type: first element type is '${type}'`);
			invalid = true;
		}

		return !invalid;
	}

	/**
	 * Public getter to obtain properties from @_children
	 */
	public get children(): ScalarLibConfigNode[] {
		return this._children;
	}
}

export abstract class ScalarLibConfigNodeImpl extends BaseLibConfigNodeImpl implements ScalarLibConfigNode {
	public readonly abstract type: 'string' | 'boolean' | 'number';
	public abstract value: string | number | boolean;
	public readonly parent: LibConfigPropertyNode;
	
	constructor(
		parent: LibConfigPropertyNode, 
		offset: number, 
		length: number,
		callbacks?: Array<(errorInfo: string) => void>) {
		super(
			offset, 
			length,
			callbacks
		);
		this.parent = parent;
	}

	/**
	 * Implementation of function, logs a console error
	 */
	public addChild (child: ScalarLibConfigNode | LibConfigNode | LibConfigPropertyNode): void {
		console.error('Trying to add child to scalar value');
	}

	/**
	 * Public getter to obtain properties from @_children
	 */
	public get children(): ScalarLibConfigNode[] {
		console.error('Trying to get children from scalar value');
		return [];
	}
}

export class StringLibConfigNodeImpl extends ScalarLibConfigNodeImpl implements StringLibConfigNode {
	public readonly type: 'string' = 'string';
	public value: string;
	
	constructor(
		parent: LibConfigPropertyNode, 
		offset: number, 
		length: number,
		value: string,
		callbacks?: Array<(errorInfo: string) => void>) {
		super(
			parent, 
			offset, 
			length,
			callbacks
		);

		this.value = value;
		this.validate(value);
	}

	/**
	 * Verifies that the child can be added to @_children
	 * 
	 * @param child The child to validate
	 */
	private validate (value: string): boolean {
		let invalid:boolean = false;

		return !invalid;
	}
}

export class NumberLibConfigNodeImpl extends ScalarLibConfigNodeImpl implements NumberLibConfigNode {
	public readonly type: 'number' = 'number';
	public value: number;

	public get isInteger():boolean {
		return this.value.toFixed(0) === this.value.toString();
	}
	
	constructor(
		parent: LibConfigPropertyNode, 
		offset: number, 
		length: number,
		value: number,
		callbacks?: Array<(errorInfo: string) => void>) {
		super(
			parent, 
			offset, 
			length,
			callbacks
		);

		this.value = value;
		this.validate(value);
	}

	/**
	 * Verifies that the child can be added to @_children
	 * 
	 * @param child The child to validate
	 */
	private validate (value: number): boolean {
		let invalid:boolean = false;

		return !invalid;
	}
}

export class BooelanLibConfigNodeImpl extends ScalarLibConfigNodeImpl implements BooleanLibConfigNode {
	public readonly type: 'boolean' = 'boolean';
	public value: boolean;
	
	constructor(
		parent: LibConfigPropertyNode, 
		offset: number, 
		length: number,
		value: boolean,
		callbacks?: Array<(errorInfo: string) => void>) {
		super(
			parent, 
			offset, 
			length,
			callbacks
		);

		this.value = value;
		this.validate(value);
	}

	/**
	 * Verifies that the child can be added to @_children
	 * 
	 * @param child The child to validate
	 */
	private validate (value: boolean): boolean {
		let invalid:boolean = false;

		return !invalid;
	}
}

