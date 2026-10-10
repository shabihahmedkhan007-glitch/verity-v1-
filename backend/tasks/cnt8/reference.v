// Human-written reference for cnt8 (task pack self-test and evals only; never shown to a model).
module cnt8 (
    input        clk,
    input        rst_n,
    input        en,
    output reg [7:0] q
);
    always @(posedge clk) begin
        if (!rst_n)
            q <= 8'd0;
        else if (en)
            q <= q + 8'd1;
    end
endmodule
