
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
  this.id   = id;
  this.grid = [];
  this.current = {row:0, col:0};
  this.log  = [];
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
                  if (this.grid[row][col].isSingleton())
                    line += div("box","b"+row+col,
                            div("singleton","s"+row+col,
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
              for (var col=0; col<9; col++)
                c.grid[row][col] = new Set(this.grid[row][col].toArray());
            }
            return c;
          },
  set : function(r,c,n) { // TODO: - propagation incomplete => can lead to dead-end
                            //     - with propagation, row/col/block checks can't fail?
          var e_s, singleton, singletons=[[r,c,n]]; // empties and singletons
          var row, col, num, next = this.clone();

          while (singletons.length>0) {
            singleton = singletons.shift();
            row = singleton[0]; col = singleton[1]; num = singleton[2];

            if (!next.grid[row][col].has(num))
              return num+" not possible at position "+row+col;
            next.grid[row][col] = new Set([num]);

            e_s = next.row_without(row,col,num);
            if (e_s[0].length>0) 
              return num+" not possible at row "+row+col;
            singletons = singletons.concat(e_s[1]);

            e_s = next.col_without(row,col,num);
            if (e_s[0].length>0) 
              return num+" not possible at column "+row+col;
            singletons = singletons.concat(e_s[1]);

            e_s = next.block_without(row,col,num);
            if (e_s[0].length>0) 
              return num+" not possible at block "+row+col;
            singletons = singletons.concat(e_s[1]);

            if (singletons.length>0)
              singletons.forEach(function(s){
                console.log("singleton at "+s[0]+s[1]+":"+s[2]) });
          }

          this.grid = next.grid;
          this.log.push([row,col,num]);
          return "set "+num+" at "+row+col;
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
  toggleCurrent : function(n) {
                    var curset = this.grid[this.current.row][this.current.col];
                    if (curset.has(n))
                      curset.remove(n);
                    else
                      curset.insert(n);
                  },
  row_without : function(r,c,n) {
                  var empties = [], singletons = [], block, wasSingleton = false;
                  for (var ci=0; ci<9; ci++) {
                    if (ci===c) continue;
                    block = this.grid[r][ci];
                    wasSingleton = block.isSingleton();
                    block.remove(n);
                    if (block.isEmpty()) empties.push([r,ci]);
                    if (block.isSingleton()&&!wasSingleton)
                      singletons.push([r,ci,block.getElement()]);
                  }
                  return [empties,singletons];
                },
  col_without : function(r,c,n) {
                  var empties = [], singletons = [], block, wasSingleton = false;
                  for (var ri=0; ri<9; ri++) {
                    if (ri===r) continue;
                    block = this.grid[ri][c];
                    wasSingleton = block.isSingleton();
                    block.remove(n);
                    if (block.isEmpty()) empties.push([ri,c]);
                    if (block.isSingleton()&&!wasSingleton)
                      singletons.push([ri,c,block.getElement()]);
                  }
                  return [empties,singletons];
                },
  block_without  : function(r,c,n) {
                     var r_ = Math.floor(r/3),
                         c_ = Math.floor(c/3);
                     var empties = [], singletons = [], block, rb, cb, wasSingleton = false;
                     for(var ri=0; ri<3; ri++)
                       for(var ci=0; ci<3; ci++) {
                         rb = 3*r_+ri; cb = 3*c_+ci;
                         if ((rb===r)&&(cb===c)) continue;
                         block = this.grid[rb][cb]; 
                         wasSingleton = block.isSingleton();
                         block.remove(n);
                         if (block.isEmpty()) empties.push([rb,cb]);
                         if (block.isSingleton()&&!wasSingleton)
                          singletons.push([rb,cb,block.getElement()]);
                       }
                     return [empties,singletons];
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
