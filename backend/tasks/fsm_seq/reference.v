// Human-written reference for fsm_seq (task pack self-test and evals only; never shown to a model).
// Detects 1011 with overlaps. detect is registered (latency 1).
module fsm_seq (
    input        clk,
    input        rst_n,
    input        din,
    output reg   detect
);
    reg [2:0] hist;

    always @(posedge clk) begin
        if (!rst_n) begin
            hist   <= 3'b000;
            detect <= 1'b0;
        end else begin
            hist   <= {hist[1:0], din};
            detect <= (hist == 3'b101) && din;
        end
    end
endmodule
