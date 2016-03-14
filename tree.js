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

function Tree(data){
	this.data = data;
	this.children = [];
	this.parent = null;
	for(var i = 1; i < arguments.length; i++){
		this.children.push(arguments[i])
		arguments[i].parent = this;
	}
}

Tree.prototype.addChild = function(n) {
	if(n == undefined)
		return;
	this.children[this.children.length] = n;
	n.parent = this;
};

Tree.prototype.removeChild = function(n){
	var i = this.children.indexOf(n);
	if(i > -1)
		this.children.splice(i, 1);
	n.parent = null;
};

Tree.prototype.replaceWith = function(n) {
	var i = this.parent.children.indexOf(this);
	n.parent = this.parent;
	this.parent.children[i] = n;
};

Tree.prototype.removeFromParent = function() {
	var parent = this.parent;
	if(parent == null)
		return
	parent.removeChild(this);
};

Tree.prototype.collapse = function(){
	if(this.children.length == 0)
		return;
	if(this.data == "PAR" || this.data == "SEQ"){
		if(this.children.length == 1){
			var parent = this.parent;
			this.data = this.children[0].data;
			this.children = this.children[0].children;
			for(var i in this.children)
				this.children[i].parent = this;
		}
	}
	for(var i in this.children){
		//this.children[i].parent = this;
		this.children[i].collapse();
	}
}

Tree.prototype.printInOrder = function() {
	var str = '';
	for(var i = 0; i < this.children.length; i++){
		str += this.children[i].printInOrder();
		str += this.data;
	}
	//str += this.children[this.children.length-1].printInOrder();
	return str;
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

Tree.prototype.copyTree = function(){
	var node = new Tree(this.data);
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
