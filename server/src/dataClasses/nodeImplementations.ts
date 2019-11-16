'use strict'

import {
	LibConfigProperty,
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

export class LibConfigPropertyImpl implements LibConfigProperty {
	public name: string;
	public value: BaseLibConfigNode;
	constructor(name: string, value: BaseLibConfigNode){
		this.name = name;
		this.value = value;
	}
}

export abstract class BaseLibConfigNodeImpl implements BaseLibConfigNode {
	public readonly abstract type: 'object' | 'array' | 'list' | 'property' | 'string' | 'number' | 'boolean';
	
	/**
	 * Error callback functions which are called whenever an error occurs
	 */
	protected errorCallbacks: Array<(errorInfo: string) => void> = [];
	
	/**
	 * Add a callback function which is called whenever an error occurs
	 * @param func The callback function being added
	 */
	public addErrorCallback(func:((errorInfo:string)=>void)){
		this.errorCallbacks.push(func);
	}

	/**
	 * Calls all callback functions with the necissary error information
	 * @param errorInfo The error information for the call
	 */
	protected Error(errorInfo:string){
		this.errorCallbacks.map((value)=>{
			value(errorInfo);
		});
	}

	public offset: number;
	public length: number = 0;
	public readonly parent: ObjectLibConfigNode | LibConfigProperty;
	public abstract addChild (child: ScalarLibConfigNode | LibConfigNode | LibConfigProperty): void;

	constructor(
		parent: ObjectLibConfigNode | LibConfigProperty, 
		offset: number, 
		length: number,
		callbacks?: Array<(errorInfo: string) => void>) {
		this.offset = offset;
		this.length = length;
		this.parent = parent;

		if(callbacks)
			callbacks.map((value)=> { this.addErrorCallback });
	}

	public toString(): string {
		return 'type: ' + this.type + ' (' + this.offset + '/' + this.length + ')' + (this.parent ? ' parent: {' + this.parent.toString() + '}' : '');
	}
}


export class ObjectLibConfigNodeImpl extends BaseLibConfigNodeImpl implements ObjectLibConfigNode {
	public readonly type: 'object' = 'object';
	private _properties: LibConfigProperty[] = [];
	
	constructor(
		parent: ObjectLibConfigNode | LibConfigProperty, 
		offset: number, 
		length: number,
		properties: LibConfigProperty[],
		callbacks?: Array<(errorInfo: string) => void>) {
		super(
			parent, 
			offset, 
			length,
			callbacks
		);

		this.addChildren(properties);
	}

	/**
	 * Convenience function to add children to the property map
	 * 
	 * @param children The children to be added
	 */
	public addChildren(children: LibConfigProperty[]): void {
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
	public addChild (child: LibConfigProperty): void {
		
		if(!this.validate(child)) return;
		this._properties.push(child);
	}

	/**
	 * Verifies that the child can be added to @_properties
	 * 
	 * @param child The child to validate
	 */
	private validate (child: LibConfigProperty): boolean {
		let invalid:boolean = false;
		this._properties.map((value, index, array) => {
			if(value.name === child.name){
				this.Error(`Duplicate properties with name '${value.name}' found!`)
				invalid = true;
			}
		});

		return !invalid;
	}
	
	/**
	 * Public getter to obtain properties from @_properties
	 */
	public get children(): LibConfigProperty[] {
		return this._properties;
	}
}

export class ListLibConfigNodeImpl extends BaseLibConfigNodeImpl implements ListLibConfigNode {
	public readonly type: 'list' = 'list';
	private _children: LibConfigNode[] = [];
	
	constructor(
		parent: LibConfigProperty, 
		offset: number, 
		length: number,
		children: LibConfigNode[],
		callbacks?: Array<(errorInfo: string) => void>) {
		super(
			parent, 
			offset, 
			length,
			callbacks
		);

		this.addChildren(children);
	}

	/**
	 * Convenience function to add children to the property map
	 * 
	 * @param children The children to be added
	 */
	public addChildren(children: LibConfigNode[]): void {
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
	public addChild (child: LibConfigNode): void {
		
		if(!this.validate(child)) return;
		this._children.push(child);
	}

	/**
	 * Verifies that the child can be added to @_children
	 * 
	 * @param child The child to validate
	 */
	private validate (child: LibConfigNode): boolean {
		let invalid:boolean = false;

		return !invalid;
	}
	
	/**
	 * Public getter to obtain properties from @_children
	 */
	public get children(): LibConfigNode[] {
		return this._children;
	}
}

export class ArrayLibConfigNodeImpl extends BaseLibConfigNodeImpl implements ArrayLibConfigNode {
	public readonly type: 'array' = 'array';
	private _children: ScalarLibConfigNode[] = [];
	
	constructor(
		parent: LibConfigProperty, 
		offset: number, 
		length: number,
		children: ScalarLibConfigNode[],
		callbacks?: Array<(errorInfo: string) => void>) {
		super(
			parent, 
			offset, 
			length,
			callbacks
		);

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
			this.Error(`Error adding child to list`);
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
	
	constructor(
		parent: LibConfigProperty, 
		offset: number, 
		length: number,
		callbacks?: Array<(errorInfo: string) => void>) {
		super(
			parent, 
			offset, 
			length,
			callbacks
		);
	}

	/**
	 * Implementation of function, logs a console error
	 */
	public addChild (child: ScalarLibConfigNode | LibConfigNode | LibConfigProperty): void {
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
		parent: LibConfigProperty, 
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
		parent: LibConfigProperty, 
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
		parent: LibConfigProperty, 
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

