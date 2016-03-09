function Queue(){
	this._oldestIndex = 1;
	this._newestIndex = 1;
	this._storage = {};	
}

Queue.prototype.size = function(){
	return this._newestIndex - this._oldestIndex;
}

Queue.prototype.enqueue = function(data){
	this._storage[this._newestIndex++] = data;
}

Queue.prototype.dequeue = function(data){
	var oldestIndex = this._oldestIndex;
	var deletedData = this._storage[oldestIndex];

	delete this._storage[oldestIndex];
	this._oldestIndex++;
	return deletedData;
}

function Node(data){
	this.data = data;

	this.parent = null;
	this.children = [];
}

Node.prototype.addChild = function(n) {
	if(n == undefined)
		return;
	this.children[this.children.length] = n;
	n.parent = this;
};

Node.prototype.removeChild = function(n){
	var i = this.children.indexOf(n);
	if(i > -1)
		this.children.splice(i, 1);
};

Node.prototype.collapse = function(){
	if(this.parent == null)
		return;
	if(this.children.length == 1){
		var i = this.parent.children.indexOf(this);
		var newchild = this.children[0];
		this.parent.children[i] = newchild;
		newchild.parent = this.parent;
		if(newchild.data == newchild.parent.data){
			newchild.parent.removeChild(newchild);
			newchild.parent.children = newchild.children.concat(newchild.parent.children);
			for(var i = 0; i < newchild.children.length; i++)
				newchild.children[i].parent = newchild.parent;
		}
	}
}

Node.prototype.applySub = function(sub_from, sub_to){
	for(var i = 0; i < this.children.length; i++){
		if(this.children[i].data == "READ" || this.children[i].data == "WRITE"){
			if(this.children[i].children[0].data == sub_from)
				this.children[i].children[0].data = sub_to;
		}
		if(this.children[i].data == "WRITE"){
			if(this.children[i].children[1].data == sub_from)
				this.children[i].children[1].data = sub_to;
		}
	}
}

Node.prototype.traverseDF = function(callback){
	(function recurse(n, level){
		callback(n.data, level);
		var length = n.children.length;
		for(var i = 0; i < length; i++){
			recurse(n.children[i], level+1);
		}
	})(this, 0);
}

Node.prototype.traverseBF = function(callback){
	var queue = new Queue();
	queue.enqueue(this);
	var level = 0;
	var n = queue.dequeue();
	while(n){
		var length = n.children.length;
		for(var i = 0; i < length; i++){
			queue.enqueue(n.children[i]);
		}
		callback(n.data, level);
		n = queue.dequeue();
	}
}

Node.prototype.traverseSyntaxTree = function(callback){
	(function recurse(n){
		if(n == undefined)
			return;
		if(n.data == "PAR"){
			n.children.forEach(recurse);
		}else if(n.data == "SEQ"){
			recurse(n.children[0]);
		}else{
			callback(n);
			//n.children.forEach(recurse);
		}
	})(this);
}

Node.prototype.copyTree = function(){
	var node = new Node(this.data);
	for(var i = 0; i < this.children.length; i++){
		node.addChild(this.children[i].copyTree());
	}
	return node;
}

Node.prototype.printInOrder = function(){
	(function recurse(n){
		if(n == undefined)
			return "";
		str = "";
		for(var i = 0; i < n.children.length - 1; i++){
			if(n.children[i] == undefined)
				continue;
			str += recurse(n.children[i]);
			str += n.data;
		}
		str += recurse(n.children[n.children.length-1]);
		return str;
	})(this);
}

function Tree(data){
	this._root = new Node(data);
}
