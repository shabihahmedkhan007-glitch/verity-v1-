// Human-written reference for add8 (task pack self-test and evals only; never shown to a model).
module add8 (
    input  [7:0] a,
    input  [7:0] b,
    input        cin,
    output [7:0] sum,
    output       cout
);
    wire [8:0] total = {1'b0, a} + {1'b0, b} + {8'd0, cin};
    assign sum  = total[7:0];
    assign cout = total[8];
endmodule
