
if (typeof console==="undefined") console = {};
if (typeof console.log==="undefined") console.log = function() {};

if (typeof Function.prototype.bind!=="function")
  Function.prototype.bind = function(it) {
    var f = this;
    return function() { return f.apply(it,arguments) }
  };

if (typeof Array.prototype.forEach!=="function")
  Array.prototype.forEach = function(cb){
    for (var i=0; i<this.length; i++) cb(this[i])
  };

// Claus Reinke, 2012
function Set(arr) {
  this.arr = arr;
}

Set.prototype = {
  has         : function(x) { return this.arr.indexOf(x)!==-1 },
  insert      : function(x) { if (this.arr.indexOf(x)===-1) this.arr.push(x) },
  without     : function(x) { return new Set(this.arr.filter(function(el){return el!==x})) },
  remove      : function(x) { this.arr = this.arr.filter(function(el){return el!==x}) },
  isEmpty     : function() { return this.arr.length==0 },
  isSingleton : function() { return this.arr.length==1 },
  getElement  : function() { if (this.arr.length>=1)
                               return this.arr[0];
                             else
                               throw "getElement on empty Set"; },
  toArray     : function() { return this.arr }
};

function Grid(id) {
  this.id      = id;
  this.grid    = [];
  this.current = {row:0, col:0};
  this.log     = [];
  this.rules   = { singletons: {active:true
                               ,description:"set position if only one marker remains"}
                 , markers:    {active:true
                               ,description:"update markers in row/column/block on every move"}
                 };
  this.initGrid();
}

Grid.prototype = {
  initGrid : function() {
                for (var row=0; row<9; row++) {
                  this.grid[row] = [];
                  for (var col=0; col<9; col++)
                    this.grid[row][col] = new Set([1,2,3,4,5,6,7,8,9]);
                }
             },
  showHTML : function() { // TODO: incremental updates, via ids
              var self = this;
              function div(cls,id,text) {
                return "<div class='"+cls+"' id='"+self.id+"-"+id+"'>"
                       +text+"</div>"
              }
              function span(cls,id,text) {
                return "<span class='"+cls+"' id='"+self.id+"-"+id+"'>"
                       +text+"</span>"
              }
              var box,line,lines=[];
              for (var row=0; row<9; row++) {
                line = "";
                for (var col=0; col<9; col++) {
                  if (this.grid[row][col].isSingleton()
                    && (this.rules.singletons.active || this.grid[row][col].set))
                    line += div("box","b"+row+col,
                            div("singleton"+(this.grid[row][col].set?" set":""),
                                "s"+row+col,
                                this.grid[row][col].getElement()));
                  else {
                    box = ""
                    for (var i=1; i<10; i++) {
                      box += span("digit","d"+row+col+i,
                                  this.grid[row][col].has(i) ? i : " ");
                    }
                    line += div("box","b"+row+col,box);
                  }
                }
                lines.push(div("line","l"+row,line));
              }
              return lines;
             },
  show : function() {
          var line;
          for (var row=0; row<9; row++) {
            if (row%3==0)
              console.log("  =====================================");
            else
              console.log("  -----------  -----------  -----------");
            for (var i=0; i<3; i++) {
              line = "||";
              for (var col=0; col<9; col++) {
                for (var j=0; j<3; j++)
                  line += this.grid[row][col].has(i*3+j+1) ? i*3+j+1 : " ";
                line += col%3==2 ? "||" : "|";
              }
              console.log(line);
            }
          }
          console.log("  =====================================");
         },
  clone : function() {
            var c = new Grid(this.id);  // TODO: move id to showHTML?
            c.current.row = this.current.row;
            c.current.col = this.current.col;
            for (var row=0; row<9; row++) {
              c.grid[row] = [];
              for (var col=0; col<9; col++) {
                c.grid[row][col] = new Set(this.grid[row][col].toArray());
                c.grid[row][col].set = this.grid[row][col].set;
              }
            }
            return c;
          },
  set : function(r,c,n) {
        // TODO: - propagation incomplete => can lead to dead-end
        //       - add other propagation rules
          var e_s, singleton, singletons=[[r,c,n]]; // empties and singletons
          var chain = []; // singletons set temporarily
          var row, col, num, next = this.clone();

          do {
            singleton = singletons.shift();
            row = singleton[0]; col = singleton[1]; num = singleton[2];

            if (!next.grid[row][col].has(num))
              return [num+" not possible at position "+row+col,chain];
            next.grid[row][col] = new Set([num]);

            e_s = next.group_without(row,col,num,this.rowCoords);
            if (e_s[0].length>0) 
              return [num+" not possible at row "+row+col,chain];
            singletons = singletons.concat(e_s[1]);

            e_s = next.group_without(row,col,num,this.columnCoords);
            if (e_s[0].length>0) 
              return [num+" not possible at column "+row+col,chain];
            singletons = singletons.concat(e_s[1]);

            e_s = next.group_without(row,col,num,this.blockCoords);
            if (e_s[0].length>0) 
              return [num+" not possible at block "+row+col,chain];
            singletons = singletons.concat(e_s[1]);

            chain.push(singleton);

            if (singletons.length>0)
              singletons.forEach(function(s){
                console.log("singleton at "+s[0]+s[1]+":"+s[2]) });
          } while ((singletons.length>0) && this.rules.singletons.active);

          if (this.rules.markers.active)
            this.grid = next.grid;
          else
            this.grid[r][c] = new Set([n]);
          this.grid[r][c].set = true;
          this.log.push([r,c,n]);
          return ["set "+n+" at "+r+c,chain];
        },
  undo : function(current) {
            this.initGrid();
            var log = this.log, self = this;
            if (current) // drop current
              log = log.filter(function(move){
                                return(move[0]!==self.current.row)
                                    ||(move[1]!==self.current.col)
                               })
            else // drop last
              log.pop();
            this.log = [];
            for (var move=0; move<log.length; move++) {
              this.set(log[move][0],log[move][1],log[move][2]);
            };
         },
  replay : function() { // replay log, possibly with changed rules
             var log  = this.log;
             this.log = [];
             this.initGrid();
             for (var move=0; move<log.length; move++) {
               this.set(log[move][0],log[move][1],log[move][2]);
             }
           },
  toggleCurrent : function(n) { // TODO: check implied singletons are valid!
                    var curset = this.grid[this.current.row][this.current.col];
                    if (curset.has(n)) {
                      if (!curset.isSingleton()) curset.remove(n);
                    } else
                      curset.insert(n);
                  },
  row    : function(r) { return this.grid[r] }, 
  column : function(c) { return [0,1,2,3,4,5,6,7,8].map(function(r){
                                                          return this.grid[r][c]
                                                        }.bind(this)) },
  block  : function(r,c) {
             var r_ = Math.floor(r/3),
                 c_ = Math.floor(c/3),
                 b  = [];
             for(var ri=0; ri<3; ri++)
               for(var ci=0; ci<3; ci++)
                 b.push(this.grid[3*r_+ri][3*c_+ci]); 
             return b;
           },
  group_without : function(r,c,n,coords) { // group (by coords) containing box rc
                                           // remove mark n from other boxes in group
                    var empties = [], singletons = [], box, wasSingleton = false;
                    coords(r,c).forEach(function(rc) {
                      var ri = rc[0], ci = rc[1];
                      if ((ci!==c)||(ri!==r)) {
                        box = this.grid[ri][ci];
                        wasSingleton = box.isSingleton();
                        box.remove(n);
                        if (box.isEmpty()) empties.push([ri,ci]);
                        if (box.isSingleton()&&!wasSingleton)
                          singletons.push([ri,ci,box.getElement()]);
                      }
                    }.bind(this));
                    return [empties,singletons];
                  },
  rowCoords :    function(r,c) {
                   return [0,1,2,3,4,5,6,7,8].map(function(ci){ return [r,ci] })
                 },
  columnCoords : function(r,c) {
                   return [0,1,2,3,4,5,6,7,8].map(function(ri){ return [ri,c] })
                 },
  blockCoords :  function(r,c) {
                  var r_ = Math.floor(r/3),
                      c_ = Math.floor(c/3),
                      b  = [];
                  for(var ri=0; ri<3; ri++)
                    for(var ci=0; ci<3; ci++)
                      b.push([3*r_+ri,3*c_+ci]);
                  return b;
                 },
  moveTo : function(r,c) {
             this.current.row = r;
             this.current.col = c;
             return this.current;
           },
  moveBy : function(r,c) {
             this.current.row = (this.current.row+r)%9;
             this.current.col = (this.current.col+c)%9;
             return this.current;
           }
}

/*
grid = new Grid();
console.log(grid.set(0,0,1));
console.log(grid.set(0,0,2));
grid.show();
grid.showHTML();
*/
