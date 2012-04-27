
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
  this.rules   = { markers:    {active:true
                               ,description:"update markers in row/column/block on every move"}
                 , singletons: {active:false
                               ,description:"set if only one marker remains on a position"}
                 , uniques:    {active:false
                               ,description:"set if only one position remains for a marker in a group"}
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
  showHTML : function() {
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
                    && (this.rules.singletons.active
                     || this.rules.uniques.active
                     || this.grid[row][col].set==="set"))
                    line += div("box","b"+row+col,
                            div(this.grid[row][col].set,
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
          var e_s, candidate, candidates=[[r,c,n,"set"]]; // empties and candidates
          var chain = []; // candidates set temporarily
          var row, col, num, mode, next = this.clone();

          do {
            candidate = candidates.shift();
            row = candidate[0]; col  = candidate[1];
            num = candidate[2]; mode = candidate[3];

            if (!next.grid[row][col].has(num))
              return [num+" not possible at position "+row+col,chain];
            next.grid[row][col] = new Set([num]);
            console.log("set "+row+col+":"+num+"("+mode+")");
            next.grid[row][col].set = mode;

            e_s = next.group_without(row,col,num,this.rowCoords);
            if (e_s[0].length>0) 
              return [num+" not possible at row "+row+col,chain];
            if (this.rules.singletons.active)
              candidates = candidates.concat(e_s[1]);

            e_s = next.group_without(row,col,num,this.columnCoords);
            if (e_s[0].length>0) 
              return [num+" not possible at column "+row+col,chain];
            if (this.rules.singletons.active)
              candidates = candidates.concat(e_s[1]);

            e_s = next.group_without(row,col,num,this.blockCoords);
            if (e_s[0].length>0) 
              return [num+" not possible at block "+row+col,chain];
            if (this.rules.singletons.active)
              candidates = candidates.concat(e_s[1]);

            chain.push(candidate);

            if ((candidates.length===0) && this.rules.uniques.active)
              candidates = next.uniques();

          } while (candidates.length>0);

          if (this.rules.markers.active)
            this.grid = next.grid;
          else
            this.grid[r][c] = new Set([n]);
          // this.grid[r][c].set = "set";
          this.log.push([r,c,n]);
          return ["set "+n+" at "+r+c,chain];
        },
  undo : function(position) {
            this.initGrid();
            var log = this.log;
            if (position) // drop move at position
              log = log.filter(function(move){
                                return(move[0]!==position.row)
                                    ||(move[1]!==position.col)
                               })
            else // drop last move
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
  toggleMark : function(position,n) { // TODO: check implied singletons are valid!
                 var curset = this.grid[position.row][position.col];
                 if (curset.has(n)) {
                   if (!curset.isSingleton()) curset.remove(n);
                 } else
                   curset.insert(n);
               },
  group_without : function(r,c,n,coords) { // group (by coords) containing box rc
                                           // remove mark n from other boxes in group
                                           // return implied empties and singletons
                    var empties = [], singletons = [], box, wasSingleton = false;
                    coords(r,c).forEach(function(rc) {
                      var ri = rc[0], ci = rc[1];
                      if ((ci!==c)||(ri!==r)) {

                        box = this.grid[ri][ci];
                        wasSingleton = box.isSingleton();
                        box.remove(n);
                        if (box.isEmpty()) empties.push([ri,ci]);
                        if (box.isSingleton()&&!wasSingleton)
                          singletons.push([ri,ci,box.getElement(),"singleton"]);

                      }
                    }.bind(this));
                    return [empties,singletons];
                  },
  uniques : function() {
              var r,c,b,d, row = [], col = [], block = [], candidates = [];
              var unique_row    = "unique row",
                  unique_column = "unique column",
                  unique_block  = "unique block";

              for (r=0; r<9; r++)
                row[r] = [1,2,3,4,5,6,7,8,9].map(function(d){return []});
              for (c=0; c<9; c++)
                col[c] = [1,2,3,4,5,6,7,8,9].map(function(d){return []});
              for (b=0; b<9; b++)
                block[b] = [1,2,3,4,5,6,7,8,9].map(function(d){return []});

              for (r=0; r<9; r++)
                for (c=0; c<9; c++)
                  for (d=1; d<10; d++)
                    if (this.grid[r][c].has(d)) {
                      row[r][d-1].push(c);
                      col[c][d-1].push(r);
                      block[Math.floor(r/3)*3+Math.floor(c/3)][d-1].push();
                    }

              for (r=0; r<9; r++)
                for (d=1; d<10; d++)
                  if (row[r][d-1].length===1)
                    candidates.push([r,row[r][d-1][0],d,unique_row]);
              for (c=0; c<9; c++)
                for (d=1; d<10; d++)
                  if (col[c][d-1].length===1)
                    candidates.push([col[c][d-1][0],c,d,unique_column]);
              for (b=0; b<9; b++)
                for (d=1; d<10; d++)
                  if (block[b][d-1].length===1)
                    candidates.push([block[b][d-1][0]
                                    ,block[b][d-1][1]
                                    ,d
                                    ,unique_block]);

              candidates = candidates.filter(function(s){
                                               return !(this.grid[s[0]][s[1]].isSingleton())
                                             }.bind(this));

              return candidates;
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
             this.current.row = (this.current.row+r+9)%9;
             this.current.col = (this.current.col+c+9)%9;
             return this.current;
           }
}
