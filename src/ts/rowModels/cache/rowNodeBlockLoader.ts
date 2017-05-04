import {RowNodeBlock} from "./rowNodeBlock";
import {Logger, LoggerFactory} from "../../logger";
import {Qualifier} from "../../context/context";
import {_} from "../../utils";

export class RowNodeBlockLoader {

    private activeBlockLoadsCount = 0;

    private blocks: RowNodeBlock[] = [];

    private maxConcurrentRequests: number;

    private logger: Logger;

    private active = true;

    constructor(maxConcurrentRequests: number) {
        this.maxConcurrentRequests = maxConcurrentRequests;
    }

    private setBeans(@Qualifier('loggerFactory') loggerFactory: LoggerFactory) {
        this.logger = loggerFactory.create('RowNodeBlockLoader');
    }

    public addBlock(block: RowNodeBlock): void {
        this.blocks.push(block);
    }

    public removeBlock(block: RowNodeBlock): void {
        _.removeFromArray(this.blocks, block);
    }

    public destroy(): void {
        this.active = false;
    }

    public loadComplete(): void {
        this.activeBlockLoadsCount--;
    }

    public checkBlockToLoad(): void {
        if (!this.active) { return; }

        this.printCacheStatus();

        if (this.activeBlockLoadsCount >= this.maxConcurrentRequests) {
            this.logger.log(`checkPageToLoad: max loads exceeded`);
            return;
        }

        let blockToLoad: RowNodeBlock = null;
        this.blocks.forEach(block => {
            if (block.getState() === RowNodeBlock.STATE_DIRTY) {
                blockToLoad = block;
            }
        });

        if (blockToLoad) {
            blockToLoad.load();
            this.activeBlockLoadsCount++;
            this.logger.log(`checkPageToLoad: loading page ${blockToLoad.getPageNumber()}`);
            this.printCacheStatus();
        } else {
            this.logger.log(`checkPageToLoad: no pages to load`);
        }
    }

    public getBlockState(): any {
        let result: any[] = [];
        this.blocks.forEach( (block: RowNodeBlock) => {
            let stateItem = {
                nodeIdPrefix: block.getNodeIdPrefix(),
                blockNumber: block.getPageNumber(),
                startRow: block.getStartRow(),
                endRow: block.getEndRow(),
                pageStatus: block.getState()
            };
            result.push(stateItem);
        });
        return result;
    }

    private printCacheStatus(): void {

        if (this.logger.isLogging()) {
            this.logger.log(`checkPageToLoad: activePageLoadsCount = ${this.activeBlockLoadsCount},`
                + ` pages = ${JSON.stringify(this.getBlockState())}`);
        }
    }
}
