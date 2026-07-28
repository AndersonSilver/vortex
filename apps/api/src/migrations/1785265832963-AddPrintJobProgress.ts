import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPrintJobProgress1785265832963 implements MigrationInterface {
    name = 'AddPrintJobProgress1785265832963'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "print_jobs" ADD "progress_percent" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "print_jobs" DROP COLUMN "progress_percent"`);
    }

}
